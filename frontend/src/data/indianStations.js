/**
 * Comprehensive Indian Railways Station Dataset & Instant Search Engine
 * Covers all major junctions, divisions, terminals, metro stations, and popular hubs.
 * Provides sub-millisecond local in-memory search with zero network dependencies.
 */

export const INDIAN_STATIONS = [
  // Delhi NCR & Northern Railway
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi', popularity: 100 },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', state: 'Delhi', popularity: 98 },
  { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi', state: 'Delhi', popularity: 96 },
  { code: 'ANVT', name: 'Anand Vihar Terminal', city: 'Delhi', state: 'Delhi', popularity: 94 },
  { code: 'DEE', name: 'Delhi Sarai Rohilla', city: 'Delhi', state: 'Delhi', popularity: 88 },
  { code: 'DEC', name: 'Delhi Cantt', city: 'Delhi', state: 'Delhi', popularity: 85 },
  { code: 'GZB', name: 'Ghaziabad Junction', city: 'Ghaziabad', state: 'Uttar Pradesh', popularity: 90 },
  { code: 'UMB', name: 'Ambala Cantt Junction', city: 'Ambala', state: 'Haryana', popularity: 89 },
  { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh', popularity: 92 },
  { code: 'LDH', name: 'Ludhiana Junction', city: 'Ludhiana', state: 'Punjab', popularity: 90 },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab', popularity: 93 },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu & Kashmir', popularity: 94 },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', city: 'Katra', state: 'Jammu & Kashmir', popularity: 96 },
  { code: 'UHP', name: 'Udhampur', city: 'Udhampur', state: 'Jammu & Kashmir', popularity: 82 },
  { code: 'KLK', name: 'Kalka', city: 'Kalka', state: 'Haryana', popularity: 85 },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand', popularity: 90 },
  { code: 'HW', name: 'Haridwar Junction', city: 'Haridwar', state: 'Uttarakhand', popularity: 93 },
  { code: 'RK', name: 'Roorkee', city: 'Roorkee', state: 'Uttarakhand', popularity: 80 },
  { code: 'KGM', name: 'Kathgodam', city: 'Kathgodam', state: 'Uttarakhand', popularity: 83 },

  // Eastern & North Eastern Railway (Kolkata, Bihar, UP, Assam)
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', popularity: 100 },
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal', popularity: 97 },
  { code: 'KOAA', name: 'Kolkata Terminal (Chitpur)', city: 'Kolkata', state: 'West Bengal', popularity: 88 },
  { code: 'SHM', name: 'Shalimar', city: 'Kolkata', state: 'West Bengal', popularity: 84 },
  { code: 'SRC', name: 'Santragachi Junction', city: 'Kolkata', state: 'West Bengal', popularity: 83 },
  { code: 'KGP', name: 'Kharagpur Junction', city: 'Kharagpur', state: 'West Bengal', popularity: 92 },
  { code: 'ASN', name: 'Asansol Junction', city: 'Asansol', state: 'West Bengal', popularity: 90 },
  { code: 'DGR', name: 'Durgapur', city: 'Durgapur', state: 'West Bengal', popularity: 86 },
  { code: 'NJP', name: 'New Jalpaiguri Junction', city: 'Siliguri', state: 'West Bengal', popularity: 94 },
  { code: 'MLDT', name: 'Malda Town', city: 'Malda', state: 'West Bengal', popularity: 87 },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam', popularity: 94 },
  { code: 'KYQ', name: 'Kamakhya Junction', city: 'Guwahati', state: 'Assam', popularity: 87 },
  { code: 'DBRG', name: 'Dibrugarh', city: 'Dibrugarh', state: 'Assam', popularity: 85 },
  { code: 'AGTL', name: 'Agartala', city: 'Agartala', state: 'Tripura', popularity: 86 },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar', popularity: 97 },
  { code: 'DNR', name: 'Danapur', city: 'Patna', state: 'Bihar', popularity: 88 },
  { code: 'RJPB', name: 'Rajendra Nagar Terminal', city: 'Patna', state: 'Bihar', popularity: 89 },
  { code: 'PPTA', name: 'Patliputra Junction', city: 'Patna', state: 'Bihar', popularity: 88 },
  { code: 'GAYA', name: 'Gaya Junction', city: 'Gaya', state: 'Bihar', popularity: 92 },
  { code: 'MGS', name: 'Mughalsarai Junction', city: 'Mughalsarai', state: 'Uttar Pradesh', popularity: 90 },
  { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya Jn', city: 'Mughalsarai', state: 'Uttar Pradesh', popularity: 96 },
  { code: 'BJU', name: 'Barauni Junction', city: 'Barauni', state: 'Bihar', popularity: 89 },
  { code: 'MFP', name: 'Muzaffarpur Junction', city: 'Muzaffarpur', state: 'Bihar', popularity: 91 },
  { code: 'SPJ', name: 'Samastipur Junction', city: 'Samastipur', state: 'Bihar', popularity: 87 },
  { code: 'DBG', name: 'Darbhanga Junction', city: 'Darbhanga', state: 'Bihar', popularity: 90 },
  { code: 'JYG', name: 'Jaynagar', city: 'Jaynagar', state: 'Bihar', popularity: 84 },
  { code: 'BKP', name: 'Bakhtiyarpur Junction', city: 'Bakhtiyarpur', state: 'Bihar', popularity: 80 },
  { code: 'BXR', name: 'Buxar', city: 'Buxar', state: 'Bihar', popularity: 83 },
  { code: 'KIR', name: 'Katihar Junction', city: 'Katihar', state: 'Bihar', popularity: 88 },
  { code: 'CPR', name: 'Chhapra Junction', city: 'Chhapra', state: 'Bihar', popularity: 89 },
  { code: 'SV', name: 'Siwan Junction', city: 'Siwan', state: 'Bihar', popularity: 85 },
  { code: 'DHN', name: 'Dhanbad Junction', city: 'Dhanbad', state: 'Jharkhand', popularity: 92 },
  { code: 'RNC', name: 'Ranchi Junction', city: 'Ranchi', state: 'Jharkhand', popularity: 93 },
  { code: 'HTE', name: 'Hatia', city: 'Ranchi', state: 'Jharkhand', popularity: 86 },
  { code: 'TATA', name: 'Tatanagar Junction', city: 'Jamshedpur', state: 'Jharkhand', popularity: 94 },
  { code: 'BKSC', name: 'Bokaro Steel City', city: 'Bokaro', state: 'Jharkhand', popularity: 87 },
  { code: 'JSG', name: 'Jharsuguda Junction', city: 'Jharsuguda', state: 'Odisha', popularity: 88 },
  { code: 'ROU', name: 'Rourkela Junction', city: 'Rourkela', state: 'Odisha', popularity: 90 },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', popularity: 95 },
  { code: 'PURI', name: 'Puri', city: 'Puri', state: 'Odisha', popularity: 94 },
  { code: 'CTC', name: 'Cuttack Junction', city: 'Cuttack', state: 'Odisha', popularity: 89 },
  { code: 'SBP', name: 'Sambalpur', city: 'Sambalpur', state: 'Odisha', popularity: 85 },
  { code: 'BAM', name: 'Brahmapur', city: 'Brahmapur', state: 'Odisha', popularity: 86 },

  // Uttar Pradesh & Central Hubs
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh', popularity: 98 },
  { code: 'LJN', name: 'Lucknow Junction (NER)', city: 'Lucknow', state: 'Uttar Pradesh', popularity: 96 },
  { code: 'LKO', name: 'Lucknow Charbagh (NR)', city: 'Lucknow', state: 'Uttar Pradesh', popularity: 96 },
  { code: 'PRYJ', name: 'Prayagraj Junction (Allahabad)', city: 'Prayagraj', state: 'Uttar Pradesh', popularity: 96 },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh', popularity: 97 },
  { code: 'BSBS', name: 'Banaras (Manduadih)', city: 'Varanasi', state: 'Uttar Pradesh', popularity: 89 },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh', popularity: 94 },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh', popularity: 94 },
  { code: 'AF', name: 'Agra Fort', city: 'Agra', state: 'Uttar Pradesh', popularity: 86 },
  { code: 'MTJ', name: 'Mathura Junction', city: 'Mathura', state: 'Uttar Pradesh', popularity: 93 },
  { code: 'JHS', name: 'Virangana Lakshmibai Jhansi', city: 'Jhansi', state: 'Uttar Pradesh', popularity: 94 },
  { code: 'GWL', name: 'Gwalior Junction', city: 'Gwalior', state: 'Madhya Pradesh', popularity: 92 },
  { code: 'ALJN', name: 'Aligarh Junction', city: 'Aligarh', state: 'Uttar Pradesh', popularity: 88 },
  { code: 'MB', name: 'Moradabad Junction', city: 'Moradabad', state: 'Uttar Pradesh', popularity: 90 },
  { code: 'BE', name: 'Bareilly Junction', city: 'Bareilly', state: 'Uttar Pradesh', popularity: 90 },
  { code: 'SPN', name: 'Shahjahanpur', city: 'Shahjahanpur', state: 'Uttar Pradesh', popularity: 82 },
  { code: 'GD', name: 'Gonda Junction', city: 'Gonda', state: 'Uttar Pradesh', popularity: 85 },
  { code: 'BST', name: 'Basti', city: 'Basti', state: 'Uttar Pradesh', popularity: 82 },
  { code: 'AY', name: 'Ayodhya Dham Junction', city: 'Ayodhya', state: 'Uttar Pradesh', popularity: 95 },
  { code: 'AYC', name: 'Ayodhya Cantt', city: 'Ayodhya', state: 'Uttar Pradesh', popularity: 92 },
  { code: 'FD', name: 'Faizabad Junction', city: 'Ayodhya', state: 'Uttar Pradesh', popularity: 85 },
  { code: 'STP', name: 'Sitapur Junction', city: 'Sitapur', state: 'Uttar Pradesh', popularity: 80 },
  { code: 'ETW', name: 'Etawah Junction', city: 'Etawah', state: 'Uttar Pradesh', popularity: 84 },
  { code: 'TDL', name: 'Tundla Junction', city: 'Tundla', state: 'Uttar Pradesh', popularity: 87 },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh', popularity: 96 },
  { code: 'RKMP', name: 'Rani Kamlapati (Habibganj)', city: 'Bhopal', state: 'Madhya Pradesh', popularity: 94 },
  { code: 'INDB', name: 'Indore Junction', city: 'Indore', state: 'Madhya Pradesh', popularity: 95 },
  { code: 'UJN', name: 'Ujjain Junction', city: 'Ujjain', state: 'Madhya Pradesh', popularity: 94 },
  { code: 'JBP', name: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh', popularity: 93 },
  { code: 'ET', name: 'Itarsi Junction', city: 'Itarsi', state: 'Madhya Pradesh', popularity: 95 },
  { code: 'RTM', name: 'Ratlam Junction', city: 'Ratlam', state: 'Madhya Pradesh', popularity: 92 },
  { code: 'KTE', name: 'Katni Junction', city: 'Katni', state: 'Madhya Pradesh', popularity: 89 },
  { code: 'STA', name: 'Satna Junction', city: 'Satna', state: 'Madhya Pradesh', popularity: 89 },
  { code: 'R', name: 'Raipur Junction', city: 'Raipur', state: 'Chhattisgarh', popularity: 93 },
  { code: 'BSP', name: 'Bilaspur Junction', city: 'Bilaspur', state: 'Chhattisgarh', popularity: 93 },
  { code: 'DURG', name: 'Durg Junction', city: 'Durg', state: 'Chhattisgarh', popularity: 90 },

  // Western Railway & Rajasthan (Mumbai, Gujarat, Rajasthan)
  { code: 'CSMT', name: 'Mumbai CSMT (Chhatrapati Shivaji)', city: 'Mumbai', state: 'Maharashtra', popularity: 100 },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', popularity: 98 },
  { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai', state: 'Maharashtra', popularity: 96 },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', city: 'Mumbai', state: 'Maharashtra', popularity: 95 },
  { code: 'DR', name: 'Dadar Central', city: 'Mumbai', state: 'Maharashtra', popularity: 94 },
  { code: 'TNA', name: 'Thane', city: 'Mumbai', state: 'Maharashtra', popularity: 92 },
  { code: 'KYN', name: 'Kalyan Junction', city: 'Mumbai', state: 'Maharashtra', popularity: 94 },
  { code: 'BVI', name: 'Borivali', city: 'Mumbai', state: 'Maharashtra', popularity: 91 },
  { code: 'PNVL', name: 'Panvel', city: 'Navi Mumbai', state: 'Maharashtra', popularity: 90 },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', popularity: 97 },
  { code: 'SUR', name: 'Solapur Junction', city: 'Solapur', state: 'Maharashtra', popularity: 88 },
  { code: 'KOP', name: 'Kolhapur CSMT', city: 'Kolhapur', state: 'Maharashtra', popularity: 86 },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra', popularity: 96 },
  { code: 'BSL', name: 'Bhusaval Junction', city: 'Bhusaval', state: 'Maharashtra', popularity: 93 },
  { code: 'NK', name: 'Nashik Road', city: 'Nashik', state: 'Maharashtra', popularity: 91 },
  { code: 'MMR', name: 'Manmad Junction', city: 'Manmad', state: 'Maharashtra', popularity: 92 },
  { code: 'AWB', name: 'Aurangabad (Chhatrapati Sambhajinagar)', city: 'Aurangabad', state: 'Maharashtra', popularity: 90 },
  { code: 'NED', name: 'Hazur Sahib Nanded', city: 'Nanded', state: 'Maharashtra', popularity: 89 },
  { code: 'AK', name: 'Akola Junction', city: 'Akola', state: 'Maharashtra', popularity: 87 },
  { code: 'BD', name: 'Badnera Junction (Amravati)', city: 'Amravati', state: 'Maharashtra', popularity: 85 },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', popularity: 98 },
  { code: 'BRC', name: 'Vadodara Junction', city: 'Vadodara', state: 'Gujarat', popularity: 96 },
  { code: 'ST', name: 'Surat', city: 'Surat', state: 'Gujarat', popularity: 96 },
  { code: 'RJT', name: 'Rajkot Junction', city: 'Rajkot', state: 'Gujarat', popularity: 91 },
  { code: 'BVC', name: 'Bhavnagar Terminus', city: 'Bhavnagar', state: 'Gujarat', popularity: 84 },
  { code: 'GIMB', name: 'Gandhidham Junction', city: 'Gandhidham', state: 'Gujarat', popularity: 87 },
  { code: 'BHUJ', name: 'Bhuj', city: 'Bhuj', state: 'Gujarat', popularity: 87 },
  { code: 'DWK', name: 'Dwarka', city: 'Dwarka', state: 'Gujarat', popularity: 89 },
  { code: 'VRL', name: 'Veraval Junction (Somnath)', city: 'Veraval', state: 'Gujarat', popularity: 88 },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', popularity: 97 },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan', popularity: 93 },
  { code: 'AII', name: 'Ajmer Junction', city: 'Ajmer', state: 'Rajasthan', popularity: 92 },
  { code: 'UDZ', name: 'Udaipur City', city: 'Udaipur', state: 'Rajasthan', popularity: 93 },
  { code: 'KOTA', name: 'Kota Junction', city: 'Kota', state: 'Rajasthan', popularity: 94 },
  { code: 'BKN', name: 'Bikaner Junction', city: 'Bikaner', state: 'Rajasthan', popularity: 90 },
  { code: 'JSM', name: 'Jaisalmer', city: 'Jaisalmer', state: 'Rajasthan', popularity: 89 },
  { code: 'ABR', name: 'Abu Road (Mount Abu)', city: 'Abu Road', state: 'Rajasthan', popularity: 88 },
  { code: 'SWM', name: 'Sawai Madhopur Junction', city: 'Sawai Madhopur', state: 'Rajasthan', popularity: 89 },
  { code: 'BTE', name: 'Bharatpur Junction', city: 'Bharatpur', state: 'Rajasthan', popularity: 85 },

  // Southern Railway & South Central (Chennai, Bengaluru, Hyderabad, Kerala, AP, Goa)
  { code: 'MAS', name: 'Chennai Central (MGR Central)', city: 'Chennai', state: 'Tamil Nadu', popularity: 100 },
  { code: 'MS', name: 'Chennai Egmore', city: 'Chennai', state: 'Tamil Nadu', popularity: 95 },
  { code: 'TBM', name: 'Tambaram', city: 'Chennai', state: 'Tamil Nadu', popularity: 88 },
  { code: 'PER', name: 'Perambur', city: 'Chennai', state: 'Tamil Nadu', popularity: 82 },
  { code: 'CBE', name: 'Coimbatore Junction', city: 'Coimbatore', state: 'Tamil Nadu', popularity: 94 },
  { code: 'MDU', name: 'Madurai Junction', city: 'Madurai', state: 'Tamil Nadu', popularity: 93 },
  { code: 'TPJ', name: 'Tiruchchirappalli Junction', city: 'Tiruchirappalli', state: 'Tamil Nadu', popularity: 92 },
  { code: 'SA', name: 'Salem Junction', city: 'Salem', state: 'Tamil Nadu', popularity: 89 },
  { code: 'ED', name: 'Erode Junction', city: 'Erode', state: 'Tamil Nadu', popularity: 90 },
  { code: 'TEN', name: 'Tirunelveli Junction', city: 'Tirunelveli', state: 'Tamil Nadu', popularity: 88 },
  { code: 'CAPE', name: 'Kanniyakumari', city: 'Kanyakumari', state: 'Tamil Nadu', popularity: 92 },
  { code: 'RMM', name: 'Rameswaram', city: 'Rameswaram', state: 'Tamil Nadu', popularity: 91 },
  { code: 'KPD', name: 'Katpadi Junction (Vellore)', city: 'Katpadi', state: 'Tamil Nadu', popularity: 91 },
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', state: 'Karnataka', popularity: 100 },
  { code: 'YPR', name: 'Yesvantpur Junction', city: 'Bengaluru', state: 'Karnataka', popularity: 96 },
  { code: 'SMVB', name: 'Sir M. Visvesvaraya Terminal', city: 'Bengaluru', state: 'Karnataka', popularity: 93 },
  { code: 'BNC', name: 'Bengaluru Cantt', city: 'Bengaluru', state: 'Karnataka', popularity: 87 },
  { code: 'MYS', name: 'Mysuru Junction', city: 'Mysuru', state: 'Karnataka', popularity: 93 },
  { code: 'UBL', name: 'SSS Hubballi Junction (Hubli)', city: 'Hubli', state: 'Karnataka', popularity: 92 },
  { code: 'MAQ', name: 'Mangaluru Central', city: 'Mangaluru', state: 'Karnataka', popularity: 90 },
  { code: 'MAJN', name: 'Mangaluru Junction', city: 'Mangaluru', state: 'Karnataka', popularity: 88 },
  { code: 'UD', name: 'Udupi', city: 'Udupi', state: 'Karnataka', popularity: 88 },
  { code: 'BAY', name: 'Ballari Junction (Bellary)', city: 'Ballari', state: 'Karnataka', popularity: 85 },
  { code: 'BJP', name: 'Vijayapura (Bijapur)', city: 'Bijapur', state: 'Karnataka', popularity: 84 },
  { code: 'TVC', name: 'Thiruvananthapuram Central (Trivandrum)', city: 'Thiruvananthapuram', state: 'Kerala', popularity: 96 },
  { code: 'ERS', name: 'Ernakulam Junction (South)', city: 'Kochi', state: 'Kerala', popularity: 95 },
  { code: 'ERN', name: 'Ernakulam Town (North)', city: 'Kochi', state: 'Kerala', popularity: 90 },
  { code: 'CLT', name: 'Kozhikode Main (Calicut)', city: 'Kozhikode', state: 'Kerala', popularity: 92 },
  { code: 'TCR', name: 'Thrissur', city: 'Thrissur', state: 'Kerala', popularity: 91 },
  { code: 'QLN', name: 'Kollam Junction (Quilon)', city: 'Kollam', state: 'Kerala', popularity: 90 },
  { code: 'ALLP', name: 'Alappuzha (Alleppey)', city: 'Alappuzha', state: 'Kerala', popularity: 89 },
  { code: 'KTYM', name: 'Kottayam', city: 'Kottayam', state: 'Kerala', popularity: 89 },
  { code: 'PGT', name: 'Palakkad Junction (Palghat)', city: 'Palakkad', state: 'Kerala', popularity: 89 },
  { code: 'CAN', name: 'Kannur', city: 'Kannur', state: 'Kerala', popularity: 88 },
  { code: 'KGQ', name: 'Kasaragod', city: 'Kasaragod', state: 'Kerala', popularity: 84 },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana', popularity: 98 },
  { code: 'HYB', name: 'Hyderabad Deccan (Nampally)', city: 'Hyderabad', state: 'Telangana', popularity: 95 },
  { code: 'KCG', name: 'Kacheguda', city: 'Hyderabad', state: 'Telangana', popularity: 92 },
  { code: 'KZJ', name: 'Kazipet Junction', city: 'Warangal', state: 'Telangana', popularity: 90 },
  { code: 'WL', name: 'Warangal', city: 'Warangal', state: 'Telangana', popularity: 88 },
  { code: 'BZA', name: 'Vijayawada Junction', city: 'Vijayawada', state: 'Andhra Pradesh', popularity: 97 },
  { code: 'VSKP', name: 'Visakhapatnam Junction', city: 'Visakhapatnam', state: 'Andhra Pradesh', popularity: 96 },
  { code: 'TPTY', name: 'Tirupati', city: 'Tirupati', state: 'Andhra Pradesh', popularity: 95 },
  { code: 'RU', name: 'Renigunta Junction', city: 'Tirupati', state: 'Andhra Pradesh', popularity: 91 },
  { code: 'GNT', name: 'Guntur Junction', city: 'Guntur', state: 'Andhra Pradesh', popularity: 90 },
  { code: 'GTL', name: 'Guntakal Junction', city: 'Guntakal', state: 'Andhra Pradesh', popularity: 91 },
  { code: 'OGL', name: 'Ongole', city: 'Ongole', state: 'Andhra Pradesh', popularity: 86 },
  { code: 'NLR', name: 'Nellore', city: 'Nellore', state: 'Andhra Pradesh', popularity: 88 },
  { code: 'RJY', name: 'Rajahmundry', city: 'Rajahmundry', state: 'Andhra Pradesh', popularity: 89 },
  { code: 'SLO', name: 'Samalkot Junction (Kakinada)', city: 'Kakinada', state: 'Andhra Pradesh', popularity: 85 },
  { code: 'CPO', name: 'Chittoor', city: 'Chittoor', state: 'Andhra Pradesh', popularity: 80 },
  { code: 'MAO', name: 'Madgaon Junction', city: 'Margao', state: 'Goa', popularity: 94 },
  { code: 'KRMI', name: 'Karmali (North Goa)', city: 'Panaji', state: 'Goa', popularity: 90 },
  { code: 'THVM', name: 'Thivim (North Goa)', city: 'Mapusa', state: 'Goa', popularity: 90 },
  { code: 'VSG', name: 'Vasco da Gama', city: 'Vasco', state: 'Goa', popularity: 86 },
];

/**
 * Clean up station query or code
 */
export function cleanCode(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (s.includes('(') && s.includes(')')) {
    return s.substring(s.lastIndexOf('(') + 1, s.lastIndexOf(')')).trim().toUpperCase();
  }
  return s.split(' ')[0].trim().toUpperCase();
}

/**
 * Ultra-Fast In-Memory Station Search
 * Prioritizes:
 * 1. Exact Code Match
 * 2. Code Starts With
 * 3. Name Starts With
 * 4. Code Contains
 * 5. City / Name Contains
 * Ranked by match quality + station popularity.
 *
 * @param {string} rawQuery Search input
 * @param {number} limit Maximum results to return (default 25)
 * @returns {Array<Object>} List of matched station objects
 */
export function searchStaticStations(rawQuery, limit = 25) {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) {
    return INDIAN_STATIONS.slice(0, limit);
  }

  const queryUpper = query.toUpperCase();
  const cleanQ = cleanCode(query);

  const exactCodeMatches = [];
  const codePrefixMatches = [];
  const namePrefixMatches = [];
  const cityPrefixMatches = [];
  const substringMatches = [];

  for (let i = 0; i < INDIAN_STATIONS.length; i++) {
    const s = INDIAN_STATIONS[i];
    const code = s.code.toUpperCase();
    const nameLower = s.name.toLowerCase();
    const cityLower = (s.city || '').toLowerCase();
    const stateLower = (s.state || '').toLowerCase();

    // 1. Exact Code
    if (code === queryUpper || (cleanQ && code === cleanQ)) {
      exactCodeMatches.push(s);
      continue;
    }

    // 2. Code Prefix (e.g., "ND" -> "NDLS")
    if (code.startsWith(queryUpper)) {
      codePrefixMatches.push(s);
      continue;
    }

    // 3. Name Prefix (e.g., "how" -> "Howrah Junction")
    if (nameLower.startsWith(query) || nameLower.split(' ').some((word) => word.startsWith(query))) {
      namePrefixMatches.push(s);
      continue;
    }

    // 4. City Prefix (e.g., "kol" -> "Kolkata")
    if (cityLower.startsWith(query)) {
      cityPrefixMatches.push(s);
      continue;
    }

    // 5. Code or Name Contains
    if (code.includes(queryUpper) || nameLower.includes(query) || cityLower.includes(query) || stateLower.includes(query)) {
      substringMatches.push(s);
    }
  }

  // Sort each bucket by popularity score
  const byPopularity = (a, b) => (b.popularity || 0) - (a.popularity || 0);

  exactCodeMatches.sort(byPopularity);
  codePrefixMatches.sort(byPopularity);
  namePrefixMatches.sort(byPopularity);
  cityPrefixMatches.sort(byPopularity);
  substringMatches.sort(byPopularity);

  const combined = [
    ...exactCodeMatches,
    ...codePrefixMatches,
    ...namePrefixMatches,
    ...cityPrefixMatches,
    ...substringMatches,
  ];

  return combined.slice(0, limit);
}

export default {
  INDIAN_STATIONS,
  searchStaticStations,
  cleanCode,
};
