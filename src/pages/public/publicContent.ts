/* ============================================================
   Public-site content — every entry carries its source.
   Checked against nadma.gov.my on 15 October 2026.
   `verify: true` marks facts taken from the general public record
   rather than an agency page; confirm these before launch.
   ============================================================ */

export const SOURCE_CHECKED = '15 October 2026';
const NADMA = 'https://www.nadma.gov.my';
const PDF = `${NADMA}/images`;

export interface Resource {
  title: string;
  /** Printed on the book spine. */
  short: string;
  /** Plain-English gloss for a Malay-language title. */
  gloss?: string;
  publisher: string;
  /** Only dates the publisher states. Omitted when none is given. */
  date?: string;
  href: string;
  format: 'PDF' | 'Web page';
}

export interface ResourceGroup {
  heading: string;
  note: string;
  items: Resource[];
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    heading: 'Policy and mechanism',
    note: 'How disaster management is organised in Malaysia.',
    items: [
      {
        title: 'Arahan NADMA No. 1: Dasar dan Mekanisme Pengurusan Bencana Negara',
        short: 'Arahan NADMA No. 1',
        gloss: 'National disaster management policy and mechanism',
        publisher: 'NADMA',
        date: 'Approved 1 August 2024',
        href: `${PDF}/2024/RujukanDalaman/Arahan_NADMA_No_1.pdf`,
        format: 'PDF',
      },
      {
        title: 'Dasar Pengurangan Risiko Bencana Negara 2030',
        short: 'DRR Policy 2030',
        gloss: 'National Disaster Risk Reduction Policy 2030',
        publisher: 'NADMA',
        date: 'Approved 25 September 2024',
        href: `${PDF}/2024/RujukanDalaman/DASAR_PENGURANGAN_RISIKO_BENCANA_NEGARA_2030_FINAL_COPY.pdf`,
        format: 'PDF',
      },
      {
        title: 'Sendai Framework for Disaster Risk Reduction 2015–2030',
        short: 'Sendai Framework',
        publisher: 'UN Office for Disaster Risk Reduction',
        date: 'Adopted 18 March 2015',
        href: 'https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030',
        format: 'Web page',
      },
    ],
  },
  {
    heading: 'SOPs',
    note: 'Peraturan Tetap Operasi for specific hazards.',
    items: [
      {
        title: 'PTO Pengendalian Bencana Tsunami',
        short: 'PTO Tsunami',
        gloss: 'Operating procedure for tsunami response',
        publisher: 'NADMA',
        href: `${PDF}/2023/GarisPanduan/RujukanDalaman/PeraturanTindakanOperasi/1PTO_Tsunami_.pdf`,
        format: 'PDF',
      },
      {
        title: 'PTO Pengendalian Bencana Gempa Bumi',
        short: 'PTO Earthquake',
        gloss: 'Operating procedure for earthquake response',
        publisher: 'NADMA',
        href: `${PDF}/2023/GarisPanduan/RujukanDalaman/PeraturanTindakanOperasi/3_PTO_Gempa_Bumi_Updated_28082023_1.pdf`,
        format: 'PDF',
      },
      {
        title: 'PTO Pengendalian Bencana Nuklear dan Radiologi',
        short: 'PTO Nuclear',
        gloss: 'Operating procedure for nuclear and radiological incidents',
        publisher: 'NADMA',
        href: `${PDF}/2023/GarisPanduan/RujukanDalaman/PeraturanTindakanOperasi/2_PTO_Pengendalian_Insiden_Nuklear_dan_Radiologi.pdf`,
        format: 'PDF',
      },
    ],
  },
  {
    heading: 'Public preparedness',
    note: 'Material written for households and communities.',
    items: [
      {
        title: 'Tindakan Kecemasan',
        short: 'Tindakan Kecemasan',
        gloss: 'What to do in an emergency',
        publisher: 'NADMA, external reference',
        href: `${PDF}/2023/GarisPanduan/rujukanluar/TindakanKecemasan.pdf`,
        format: 'PDF',
      },
      {
        title: 'Panduan Modul Program Pengurusan Risiko Bencana Berasaskan Masyarakat (CBDRM)',
        short: 'CBDRM Module',
        gloss: 'Community-based disaster risk management module',
        publisher: 'NADMA',
        href: `${PDF}/2023/GarisPanduan/RujukanDalaman/GarisPanduan/3_Panduan_Modul_Program_Pengurusan_Risiko_Bencana_Berasaskan_Masyarakat_CBDRM.pdf`,
        format: 'PDF',
      },
      {
        title: 'Pelan Tindakan Pengurusan Kesihatan Akibat Jerebu',
        short: 'Haze Action Plan',
        gloss: 'Haze health management action plan',
        publisher: 'NADMA, external reference',
        date: 'Edition 2020',
        href: `${PDF}/2023/GarisPanduan/rujukanluar/PELAN_TINDAKAN_PENGURUSAN_KESIHATAN_AKIBAT_JEREBU_2020.pdf`,
        format: 'PDF',
      },
    ],
  },
];

export interface Publication {
  title: string;
  gloss?: string;
  /** Short label printed large on the cover. */
  mark: string;
  publisher: string;
  date?: string;
  summary: string;
  href: string;
}

/** Selected for the fold-out reader. `null` is an unprinted panel awaiting a document. */
export const PUBLICATIONS: (Publication | null)[] = [
  {
    mark: 'No. 1',
    title: 'Arahan NADMA No. 1',
    gloss: 'Dasar dan Mekanisme Pengurusan Bencana Negara',
    publisher: 'NADMA',
    date: '1 August 2024',
    summary: 'The national policy and mechanism for managing disasters. It replaced MKN Directive No. 20.',
    href: `${PDF}/2024/RujukanDalaman/Arahan_NADMA_No_1.pdf`,
  },
  {
    mark: '2030',
    title: 'Dasar Pengurangan Risiko Bencana Negara 2030',
    gloss: 'National Disaster Risk Reduction Policy',
    publisher: 'NADMA',
    date: '25 September 2024',
    summary: 'The national policy for reducing disaster risk up to 2030, approved by the Cabinet.',
    href: `${PDF}/2024/RujukanDalaman/DASAR_PENGURANGAN_RISIKO_BENCANA_NEGARA_2030_FINAL_COPY.pdf`,
  },
  {
    mark: '24–28',
    title: 'Pelan Strategik NADMA 2024–2028',
    gloss: 'NADMA Strategic Plan',
    publisher: 'NADMA',
    summary: "The agency's strategic plan for the five years from 2024 to 2028.",
    href: `${PDF}/2025/TerbitanDalaman/PELAN_STRATEGIK_NADMA_2024-2028.pdf`,
  },
  {
    mark: 'NRR',
    title: 'National Risk Register',
    publisher: 'NADMA',
    summary: 'The national register of the hazards Malaysia plans for.',
    href: `${PDF}/2024/RujukanDalaman/National_Risk_Register_.pdf`,
  },
  {
    mark: 'MTL',
    title: 'Laporan Impak Monsun Timur Laut 2023/2024',
    gloss: 'Northeast Monsoon impact report',
    publisher: 'NADMA',
    summary: 'A report on the impact of the 2023/2024 Northeast Monsoon season.',
    href: `${PDF}/2024/08/LAPORAN_IMPAK_MONSUN_TIMUR_LAUT_2023_2024.pdf`,
  },
  {
    mark: 'SFDRR',
    title: 'Sendai Framework 2015–2030',
    gloss: 'Framework for Disaster Risk Reduction',
    publisher: 'UNDRR',
    date: '18 March 2015',
    summary: 'The international framework for reducing disaster risk, adopted by UN member states.',
    href: 'https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030',
  },
  null,
];

export interface Milestone {
  date: string;
  year: string;
  title: string;
  text: string;
  source: 'NADMA' | 'Public record';
  verify?: boolean;
}

export const MILESTONES: Milestone[] = [
  {
    date: '11 December 1993',
    year: '1993',
    title: 'Highland Towers collapse',
    text: 'A condominium block collapses in Ulu Klang, Selangor. The national response that followed shaped later disaster policy.',
    source: 'Public record',
    verify: true,
  },
  {
    date: '1997',
    year: '1997',
    title: 'MKN Directive No. 20',
    text: 'The National Security Council sets out the national disaster management policy and mechanism.',
    source: 'Public record',
    verify: true,
  },
  {
    date: '30 March 2012',
    year: '2012',
    title: 'Directive No. 20 revised',
    text: 'A revised edition of the directive is issued.',
    source: 'NADMA',
  },
  {
    date: 'December 2014',
    year: '2014',
    title: 'The Bah Kuning floods',
    text: '25 deaths, 541,896 people evacuated, and losses of about RM2.9 billion.',
    source: 'NADMA',
  },
  {
    date: '18 March 2015',
    year: '2015',
    title: 'Sendai Framework adopted',
    text: 'UN member states adopt the international framework for disaster risk reduction to 2030.',
    source: 'Public record',
  },
  {
    date: '29 July 2015',
    year: '2015',
    title: 'Disaster management separated',
    text: 'The Cabinet moves disaster management out of the National Security Council.',
    source: 'NADMA',
  },
  {
    date: '1 October 2015',
    year: '2015',
    title: 'NADMA begins operations',
    text: "The agency starts work under the Prime Minister's Department as national coordinator.",
    source: 'NADMA',
  },
  {
    date: '1 August 2024',
    year: '2024',
    title: 'Arahan NADMA No. 1',
    text: 'A new national policy and mechanism replaces MKN Directive No. 20.',
    source: 'NADMA',
  },
  {
    date: '25 September 2024',
    year: '2024',
    title: 'DRR Policy 2030 approved',
    text: 'The Cabinet approves the National Disaster Risk Reduction Policy 2030.',
    source: 'NADMA',
  },
];

export interface Hotline {
  number: string;
  /** Digits only, for tel: links. */
  dial: string;
  name: string;
  detail: string;
  source: string;
  verify?: boolean;
}

/** The three lines the landing page shows; each is verified at its source. */
export const KEY_LINES = [
  { number: '999', dial: '999', name: 'Emergency', detail: 'Police, ambulance, fire and rescue' },
  { number: '+603 8870 4800', dial: '+60388704800', name: 'NADMA office', detail: 'Office hours, not for emergencies' },
  { number: '1-300-22-1638', dial: '1300221638', name: 'MetMalaysia', detail: 'Weather warnings' },
];

export const EMERGENCY_LINES: Hotline[] = [
  { number: '999', dial: '999', name: 'Emergency services', detail: 'Police, ambulance, fire and rescue, civil defence.', source: 'MERS 999, national emergency service' },
  { number: '112', dial: '112', name: 'From a mobile phone', detail: 'Connects to the same emergency service.', source: 'MCMC, public record', verify: true },
  { number: '15999', dial: '15999', name: 'Talian Kasih', detail: 'Welfare and family support, including after a disaster.', source: 'KPWKM, public record', verify: true },
];

export interface Channel {
  name: string;
  owner: string;
  detail: string;
  href: string;
  phone?: { label: string; dial: string };
}

export const LIVE_CHANNELS: Channel[] = [
  {
    name: 'Portal Bencana',
    owner: 'NADMA and the National Disaster Control Centre',
    detail: 'Official announcements and links to agency tools during a disaster.',
    href: 'https://portalbencana.nadma.gov.my',
  },
  {
    name: 'Public InfoBanjir',
    owner: 'Department of Irrigation and Drainage (JPS)',
    detail: 'Live river levels, rainfall and flood alerts.',
    href: 'https://publicinfobanjir.water.gov.my',
  },
  {
    name: 'MetMalaysia warnings',
    owner: 'Malaysian Meteorological Department',
    detail: 'Thunderstorm, heavy rain, strong wind and tsunami warnings.',
    href: 'https://www.met.gov.my',
    phone: { label: '1-300-22-1638', dial: '1300221638' },
  },
  {
    name: 'District operations centres (PKOB)',
    owner: 'NADMA',
    detail: 'Phone numbers for each district disaster operations control centre.',
    href: 'https://portalbencana.nadma.gov.my/images/ndcc/documents/PKOB/SENARAI_NOMBOR_PEJABAT_DAERAH.pdf',
  },
];

export const NADMA_OFFICE = {
  name: 'Agensi Pengurusan Bencana Negara (NADMA)',
  parent: "Prime Minister's Department",
  phone: { label: '+603 8870 4800', dial: '+60388704800' },
  address: [
    'Aras B1, 6 dan 7, Setia Perkasa 5',
    'Kompleks Setia Perkasa, Pusat Pentadbiran Kerajaan Persekutuan',
    '62502 Putrajaya',
  ],
  website: { label: 'nadma.gov.my', href: NADMA },
};
