/**
 * /api/fs/list 文件目录列表
 */
export interface FsList {
  code: number;
  message: string;
  data: {
    content: [
      name: string,
      size: number,
      is_dir: boolean,
      modified: string, //修改时间
      sign: string, //签名
      thumb: string, //略缩图
      type: number, //类型
    ];
    total: number; //总数
    readme: string; //说明?
    write: boolean; //是否可写入
    provider: string;
    header: string;
  };
}

/**
 * /api/fs/get 获取文件/目录信息
 */
export interface FileInfo {
  code: number;
  message: string;
  data: {
    name: string;
    size: number;
    is_dir: boolean;
    modified: string;
    sign: string;
    thumb: string;
    type: number;
    raw_url: string; //原始url
    readme: string;
    provider: string;
    created: string; //创建时间
    header: string;
  };
}

/**
 * /api/fs/put 流式上传文件
 */
export interface FileUpload {
  code: number;
  message: string;
  data: {
    task: {
      id: string;
      name: string;
      state: number;
      status: string;
      progress: number;
      error: string;
    };
  };
}
