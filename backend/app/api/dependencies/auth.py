"""
Supabase JWT Authentication Dependencies for FastAPI.
Verifies the Supabase-issued JWT access token from the Authorization header
and extracts the authenticated user's identity.

Uses python-jose (already in requirements.txt) to decode and verify tokens
against the Supabase project's JWT secret.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

# FastAPI security scheme — extracts Bearer token from Authorization header
security = HTTPBearer(auto_error=False)


def _decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decode and verify a Supabase JWT access token.

    Supabase JWTs use HS256 algorithm signed with the project's JWT secret.
    The token payload includes:
      - sub: User ID (UUID)
      - email: User's email
      - role: Supabase role (typically 'authenticated')
      - user_metadata: Custom metadata set during signup
      - aud: Audience (typically 'authenticated')
      - exp: Expiration timestamp
      - iat: Issued at timestamp
      - iss: Issuer URL (Supabase project URL + /auth/v1)
    """
    jwt_secret = settings.SUPABASE_JWT_SECRET
    if not jwt_secret:
        logger.error("SUPABASE_JWT_SECRET is not configured. Cannot verify JWT tokens.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service is not properly configured.",
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and verifies the Supabase JWT from the
    Authorization: Bearer header.

    Returns the decoded JWT payload containing the authenticated user's info.
    Raises 401 if the token is missing, invalid, or expired.

    Usage:
        @router.post("/protected")
        def protected_endpoint(user: dict = Depends(get_current_user)):
            user_id = user["sub"]
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_supabase_jwt(credentials.credentials)

    # Verify the token contains a valid user ID
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication dependency. Returns the decoded JWT payload if a
    valid token is present, or None if no token is provided.
    Useful for endpoints that behave differently for authenticated vs anonymous users.

    Usage:
        @router.get("/public-or-private")
        def endpoint(user: dict | None = Depends(get_optional_user)):
            if user:
                # Authenticated path
            else:
                # Anonymous path
    """
    if not credentials:
        return None

    try:
        payload = _decode_supabase_jwt(credentials.credentials)
        return payload if payload.get("sub") else None
    except HTTPException:
        return None


def require_role(required_role: str):
    """
    Factory that creates a dependency requiring the authenticated user to have
    a specific role in their user_metadata.

    Usage:
        @router.post("/admin-only")
        def admin_endpoint(user: dict = Depends(require_role("CONTROL_ROOM"))):
            ...
    """
    async def _check_role(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_metadata = user.get("user_metadata", {})
        user_role = user_metadata.get("role", "")

        if user_role != required_role:
            logger.warning(
                f"Access denied: user {user.get('sub')} has role '{user_role}', "
                f"required '{required_role}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}.",
            )

        return user

    return _check_role


# Pre-built role dependency for Control Room access
require_control_room = require_role("CONTROL_ROOM")
