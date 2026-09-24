export const MALAYSIA_STATES_LIST = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'WP Kuala Lumpur',
  'WP Putrajaya',
  'WP Labuan',
  'Nationwide / All States',
] as const;

export const MALAYSIA_DISTRICTS_MAP: Record<string, string[]> = {
  'Johor': [
    'Johor Bahru', 'Batu Pahat', 'Muar', 'Kluang', 'Kulai', 'Segamat', 'Pontian', 'Kota Tinggi', 'Tangkak', 'Mersing'
  ],
  'Kedah': [
    'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Baling', 'Padang Terap', 'Pendang', 'Yan', 'Sik', 'Bandar Baharu', 'Langkawi', 'Pokok Sena'
  ],
  'Kelantan': [
    'Kota Bharu', 'Pasir Mas', 'Tumpat', 'Bachok', 'Tanah Merah', 'Pasir Puteh', 'Kuala Krai', 'Machang', 'Gua Musang', 'Jeli', 'Lojing'
  ],
  'Melaka': [
    'Melaka Tengah', 'Alor Gajah', 'Jasin'
  ],
  'Negeri Sembilan': [
    'Seremban', 'Jempol', 'Port Dickson', 'Tampin', 'Kuala Pilah', 'Rembau', 'Jelebu'
  ],
  'Pahang': [
    'Kuantan', 'Temerloh', 'Bentong', 'Maran', 'Rompin', 'Pekan', 'Bera', 'Raub', 'Jerantut', 'Lipis', 'Cameron Highlands'
  ],
  'Perak': [
    'Kinta (Ipoh)', 'Larut, Matang & Selama', 'Manjung', 'Hilir Perak', 'Kerian', 'Batang Padang', 'Kuala Kangsar', 'Perak Tengah', 'Hulu Perak', 'Kampar', 'Muallim', 'Bagan Datuk'
  ],
  'Perlis': [
    'Kangar', 'Arau', 'Padang Besar', 'Kuala Perlis'
  ],
  'Pulau Pinang': [
    'Timur Laut (George Town)', 'Seberang Perai Tengah', 'Seberang Perai Utara', 'Barat Daya', 'Seberang Perai Selatan'
  ],
  'Sabah': [
    'Kota Kinabalu', 'Sandakan', 'Tawau', 'Lahad Datu', 'Keningau', 'Kinabatangan', 'Penampang', 'Papang', 'Beaufort', 'Tuaran', 'Kudat', 'Ranau', 'Semporna'
  ],
  'Sarawak': [
    'Kuching', 'Miri', 'Sibu', 'Bintulu', 'Samarahan', 'Sri Aman', 'Betong', 'Sarikei', 'Mukah', 'Limbang', 'Kapit', 'Lawas', 'Serian'
  ],
  'Selangor': [
    'Petaling (Shah Alam/PJ)', 'Hulu Langat', 'Klang', 'Gombak', 'Kuala Langat', 'Sepang', 'Kuala Selangor', 'Hulu Selangor', 'Sabak Bernam'
  ],
  'Terengganu': [
    'Kuala Terengganu', 'Kemaman', 'Dungun', 'Besut', 'Marang', 'Hulu Terengganu', 'Setiu', 'Kuala Nerus'
  ],
  'WP Kuala Lumpur': [
    'Kuala Lumpur Central', 'Cheras', 'Kepong', 'Bukit Bintang', 'Setiawangsa', 'Wangsa Maju', 'Batu', 'Segambut', 'Lembah Pantai', 'Titiwangsa', 'Seputeh', 'Bandar Tun Razak'
  ],
  'WP Putrajaya': [
    'Putrajaya Precinct 1-20'
  ],
  'WP Labuan': [
    'Victoria / Labuan Island'
  ],
  'Nationwide / All States': [
    'All Districts Nationwide'
  ],
};
