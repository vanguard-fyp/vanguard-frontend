export interface MatrixRow {
  module: string;
  officer: string;
  coordinator: string;
  manager: string;
  admin: string;
}

export interface AgencyItem {
  id: string;
  name: string;
  type: string;
  contact: string;
  status: 'Connected' | 'Standby' | 'Disconnected';
}
