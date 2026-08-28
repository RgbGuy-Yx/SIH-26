"""
Indian Railways ETA & Delay Prediction Model Training Script
Using XGBoost Regressor
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score


def main():
    print("=" * 80)
    print(" INDIAN RAILWAYS DELAY-PREDICTION MODEL TRAINING (XGBOOST)")
    print("=" * 80)

    # ---------------------------------------------------------
    # TASK 1: Prepare the data
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 1: Loading & Preparing Dataset")
    print("-" * 80)

    # Locate CSV file
    csv_paths = [
        "final_training_features.csv",
        os.path.join("..", "railway", "final_training_features.csv"),
        r"D:\railway\final_training_features.csv",
        r"D:\railway_model\final_training_features.csv"
    ]
    
    csv_path = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_path = p
            break
            
    if not csv_path:
        raise FileNotFoundError("Could not find final_training_features.csv in expected locations.")

    print(f"Loading data from: {os.path.abspath(csv_path)}")
    df_raw = pd.read_csv(csv_path)
    total_raw_rows = len(df_raw)
    print(f"Total raw rows loaded: {total_raw_rows:,}")

    # Drop rows where weather_data_available is False
    # Ensure boolean evaluation handles bool, string, or int types
    if df_raw['weather_data_available'].dtype == object:
        weather_mask = df_raw['weather_data_available'].astype(str).str.lower().isin(['true', '1', 't'])
    else:
        weather_mask = df_raw['weather_data_available'].astype(bool)

    dropped_rows = total_raw_rows - weather_mask.sum()
    df = df_raw[weather_mask].copy()
    print(f"Dropped {dropped_rows:,} rows where weather_data_available == False.")
    print(f"Remaining training rows: {len(df):,}")

    # Feature definitions
    # Explicitly EXCLUDE train_no, station_name, type_code, date, coordinates, etc.
    feature_cols = [
        'hour_of_day',
        'current_accumulated_delay',
        'priority_tier',
        'is_foggy',
        'avg_temperature',
        'total_precipitation',
        'avg_wind_speed',
        'avg_cloud_cover'
    ]

    print(f"\nFeature columns selected ({len(feature_cols)} features):")
    for idx, col in enumerate(feature_cols, 1):
        print(f"  {idx}. {col}")
    print("Excluded features (identity-agnostic generalization): train_no, station_name, station_no, etc.")

    # Ordinal encoding validation for priority_tier (1 to 4)
    df['priority_tier'] = df['priority_tier'].astype(int)
    # Ensure is_foggy is float / int (0 or 1)
    df['is_foggy'] = df['is_foggy'].fillna(0).astype(float)

    # Define X, y and preserve evaluation metadata
    X = df[feature_cols].copy()
    y = df['delay'].astype(float).copy()

    # Metadata for post-evaluation slices (Task 5)
    meta_cols = ['train_no', 'priority_tier']
    if 'train_name' in df.columns:
        meta_cols.append('train_name')
    meta_df = df[meta_cols].copy()

    # ---------------------------------------------------------
    # TASK 2: Train/Test Split
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 2: Train/Test Split (80/20)")
    print("-" * 80)

    RANDOM_STATE = 42
    X_train, X_test, y_train, y_test, meta_train, meta_test = train_test_split(
        X, y, meta_df, test_size=0.20, random_state=RANDOM_STATE
    )

    print(f"Training feature set (X_train) shape : {X_train.shape}")
    print(f"Testing feature set  (X_test)  shape : {X_test.shape}")
    print(f"Training target      (y_train) shape : {y_train.shape}")
    print(f"Testing target       (y_test)  shape : {y_test.shape}")

    # ---------------------------------------------------------
    # TASK 3: Train XGBoost Model
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 3: Training XGBoost Regressor")
    print("-" * 80)

    xgb_params = {
        'n_estimators': 200,
        'max_depth': 6,
        'learning_rate': 0.1,
        'random_state': RANDOM_STATE,
        'n_jobs': -1,
        'tree_method': 'hist'
    }
    print(f"Hyperparameters: {xgb_params}")
    model = xgb.XGBRegressor(**xgb_params)

    print("Fitting XGBoost model on training set...")
    model.fit(X_train, y_train)
    print("Model training completed successfully!")

    # ---------------------------------------------------------
    # TASK 4: Model Evaluation & Baseline Comparison
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 4: Model Evaluation & Baselines")
    print("-" * 80)

    # Predictions
    y_pred = model.predict(X_test)

    # Metrics for trained XGBoost model
    xgb_mae = mean_absolute_error(y_test, y_pred)
    xgb_rmse = root_mean_squared_error(y_test, y_pred)
    xgb_r2 = r2_score(y_test, y_pred)

    # Baseline 1: Naive Timetable (Predict 0 delay)
    y_pred_zero = np.zeros_like(y_test)
    base_zero_mae = mean_absolute_error(y_test, y_pred_zero)
    base_zero_rmse = root_mean_squared_error(y_test, y_pred_zero)
    base_zero_r2 = r2_score(y_test, y_pred_zero)

    # Baseline 2: Naive Mean (Predict training set's mean delay)
    y_train_mean = y_train.mean()
    y_pred_mean = np.full_like(y_test, y_train_mean)
    base_mean_mae = mean_absolute_error(y_test, y_pred_mean)
    base_mean_rmse = root_mean_squared_error(y_test, y_pred_mean)
    base_mean_r2 = r2_score(y_test, y_pred_mean)

    print("\n--- Performance Comparison Table ---")
    print(f"{'Model / Baseline':<40} | {'MAE (mins)':<12} | {'RMSE (mins)':<12} | {'R2 Score':<10}")
    print("-" * 82)
    print(f"{'Naive Static Timetable (Predict 0 min)':<40} | {base_zero_mae:>12.2f} | {base_zero_rmse:>12.2f} | {base_zero_r2:>10.4f}")
    print(f"{'Naive Global Mean (' + f'{y_train_mean:.1f}m)':<40} | {base_mean_mae:>12.2f} | {base_mean_rmse:>12.2f} | {base_mean_r2:>10.4f}")
    print(f"{'XGBoost Regressor (Trained Model)':<40} | {xgb_mae:>12.2f} | {xgb_rmse:>12.2f} | {xgb_r2:>10.4f}")
    print("-" * 82)

    zero_mae_improvement = ((base_zero_mae - xgb_mae) / base_zero_mae) * 100
    mean_mae_improvement = ((base_mean_mae - xgb_mae) / base_mean_mae) * 100
    print(f"\n--> Improvement over Static Timetable (0 delay) : {zero_mae_improvement:.2f}% reduction in MAE ({base_zero_mae - xgb_mae:.2f} mins lower)")
    print(f"--> Improvement over Historical Mean delay     : {mean_mae_improvement:.2f}% reduction in MAE ({base_mean_mae - xgb_mae:.2f} mins lower)")

    # Feature Importances
    print("\n--- Feature Importances (Sorted Descending) ---")
    importances = model.feature_importances_
    feat_imp_df = pd.DataFrame({
        'Feature': feature_cols,
        'Importance_Score': importances,
        'Percentage': importances * 100
    }).sort_values(by='Importance_Score', ascending=False).reset_index(drop=True)

    print(f"{'Rank':<5} | {'Feature Name':<30} | {'Importance':<12} | {'Percentage':<10}")
    print("-" * 65)
    for idx, row in feat_imp_df.iterrows():
        print(f"{idx+1:<5} | {row['Feature']:<30} | {row['Importance_Score']:>12.4f} | {row['Percentage']:>9.2f}%")

    # ---------------------------------------------------------
    # TASK 5: Per-Train and Per-Tier Breakdown
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 5: Sub-segment Breakdown on Test Set")
    print("-" * 80)

    eval_df = meta_test.copy()
    eval_df['actual_delay'] = y_test
    eval_df['predicted_delay'] = y_pred
    eval_df['abs_error'] = np.abs(y_test - y_pred)
    eval_df['squared_error'] = (y_test - y_pred) ** 2

    # Priority Tier breakdown
    tier_names = {
        1: "Tier 1 (Premium / Rajdhani / Shatabdi / Vande Bharat)",
        2: "Tier 2 (Superfast / Express)",
        3: "Tier 3 (Mail / Ordinary Passenger)",
        4: "Tier 4 (Freight / Special / Other)"
    }
    print("\n--- Breakdown by Priority Tier ---")
    tier_summary = eval_df.groupby('priority_tier').agg(
        sample_count=('actual_delay', 'count'),
        mean_actual_delay=('actual_delay', 'mean'),
        mae=('abs_error', 'mean'),
        rmse=('squared_error', lambda x: np.sqrt(np.mean(x)))
    ).reset_index()

    print(f"{'Tier':<6} | {'Tier Description':<42} | {'Samples':<8} | {'Avg Delay':<10} | {'MAE (mins)':<10} | {'RMSE':<10}")
    print("-" * 96)
    for _, row in tier_summary.iterrows():
        t_int = int(row['priority_tier'])
        t_desc = tier_names.get(t_int, f"Tier {t_int}")
        print(f"{t_int:<6} | {t_desc:<42} | {int(row['sample_count']):<8} | {row['mean_actual_delay']:>9.2f}m | {row['mae']:>9.2f}m | {row['rmse']:>9.2f}m")

    # Train No breakdown
    print("\n--- Breakdown by Train Number ---")
    train_summary = eval_df.groupby(['train_no', 'train_name'] if 'train_name' in eval_df.columns else 'train_no').agg(
        sample_count=('actual_delay', 'count'),
        mean_actual_delay=('actual_delay', 'mean'),
        mae=('abs_error', 'mean'),
        rmse=('squared_error', lambda x: np.sqrt(np.mean(x)))
    ).reset_index().sort_values(by='sample_count', ascending=False)

    if 'train_name' in eval_df.columns:
        print(f"{'Train No':<10} | {'Train Name':<28} | {'Samples':<8} | {'Avg Delay':<10} | {'MAE (mins)':<10} | {'RMSE':<10}")
        print("-" * 88)
        for _, row in train_summary.iterrows():
            print(f"{str(row['train_no']):<10} | {str(row['train_name'])[:28]:<28} | {int(row['sample_count']):<8} | {row['mean_actual_delay']:>9.2f}m | {row['mae']:>9.2f}m | {row['rmse']:>9.2f}m")
    else:
        print(f"{'Train No':<10} | {'Samples':<8} | {'Avg Delay':<10} | {'MAE (mins)':<10} | {'RMSE':<10}")
        print("-" * 56)
        for _, row in train_summary.iterrows():
            print(f"{str(row['train_no']):<10} | {int(row['sample_count']):<8} | {row['mean_actual_delay']:>9.2f}m | {row['mae']:>9.2f}m | {row['rmse']:>9.2f}m")

    # ---------------------------------------------------------
    # TASK 6: Save Model & Feature Schema
    # ---------------------------------------------------------
    print("\n" + "-" * 80)
    print("TASK 6: Saving Model Artifacts")
    print("-" * 80)

    model_filename = "xgboost_eta_model.pkl"
    features_filename = "model_features.json"

    # Save trained model
    joblib.dump(model, model_filename)
    print(f"[OK] Trained model saved to: {os.path.abspath(model_filename)}")

    # Save feature column list
    with open(features_filename, "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, indent=2)
    print(f"[OK] Feature column schema saved to: {os.path.abspath(features_filename)}")

    print("\n" + "=" * 80)
    print(" MODEL TRAINING AND EVALUATION PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()
