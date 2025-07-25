interface IUser {
  name: string;
  qq: string;
  password: string;
  isAdmin: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export default IUser;
