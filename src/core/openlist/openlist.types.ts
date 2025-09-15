export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DirectoryList {
  path: string;
  name: string;
  is_directory: boolean;
  size: number;
  modified_at: string;
}

export interface FileInfo {
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
  modified_at: string;
  is_directory: boolean;
}
