class date {
  /**
   * 获取当前日期 (格式: YYYYMMDD)
   */
  public static getCurrentDate(): string {
    const now = new Date();
    return [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
  }

  /**
   * 获取当前时间 (格式: HH:mm:ss)
   */
  public static getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * 获取格式化日期时间
   * @param formatStr 格式字符串 (YYYY-年, MM-月, DD-日, HH-时, mm-分, ss-秒)
   * @example format('YYYY-MM-DD HH:mm:ss') => '2023-10-15 14:30:45'
   */
  public static format(formatStr: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const now = new Date();

    const replacements: Record<string, string> = {
      YYYY: now.getFullYear().toString(),
      MM: (now.getMonth() + 1).toString().padStart(2, '0'),
      DD: now.getDate().toString().padStart(2, '0'),
      HH: now.getHours().toString().padStart(2, '0'),
      mm: now.getMinutes().toString().padStart(2, '0'),
      ss: now.getSeconds().toString().padStart(2, '0'),
    };

    return formatStr.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => replacements[match]);
  }

  /**
   * 计算日期差值
   * @param start 开始日期
   * @param end 结束日期 (默认当前时间)
   * @param unit 返回单位 ('days' | 'hours' | 'minutes' | 'seconds')
   */
  public static diff(
    start: Date,
    end: Date = new Date(),
    unit: 'days' | 'hours' | 'minutes' | 'seconds' = 'days'
  ): number {
    const msDiff = end.getTime() - start.getTime();

    switch (unit) {
      case 'seconds':
        return Math.floor(msDiff / 1000);
      case 'minutes':
        return Math.floor(msDiff / (1000 * 60));
      case 'hours':
        return Math.floor(msDiff / (1000 * 60 * 60));
      case 'days':
        return Math.floor(msDiff / (1000 * 60 * 60 * 24));
      default:
        return msDiff;
    }
  }
}

export default date;
