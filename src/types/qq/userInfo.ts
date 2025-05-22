export default interface UserInfo {
  qq: number;
  email?: string;
  labAccount?: string;
  username: string;
  nickname?: string;

  /**
   * 管理的群
   * 第一个number为群号，第二个number为在群内的botId
   */
  manageGroups: Record<number, number[]>;
  role: 'super' | 'admin' | 'user';
  balance: number;
  bots: number[];
}
