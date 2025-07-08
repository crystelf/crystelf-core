class Core {
  private static _instance: Core;
  private _services: Map<string, any> = new Map();
  [key: string]: any;
  private constructor() {}

  public static get logger() {
    return Core.getInstance()._services.get('logger');
  }

  public static get redis() {
    return Core.getInstance()._services.get('redis');
  }

  public static get ws() {
    return Core.getInstance()._services.get('ws');
  }

  public static get tools() {
    return Core.getInstance()._services.get('tools');
  }

  public static get system() {
    return Core.getInstance()._services.get('system');
  }

  public static get response() {
    return Core.getInstance()._services.get('response');
  }

  public static get file() {
    return Core.getInstance()._services.get('file');
  }

  /**
   * 注册服务
   * @param name 服务名称
   * @param service 服务
   */
  public static registerService(name: string, service: any): void {
    Core.getInstance()._services.set(name, service);
  }

  private static getInstance(): Core {
    if (!Core._instance) {
      Core._instance = new Core();
    }
    return Core._instance;
  }

  /**
   * 是否有某个依赖
   * @param name 依赖名
   */
  public static hasService(name: string): boolean {
    return Core.getInstance()._services.has(name);
  }
}

export default Core;
