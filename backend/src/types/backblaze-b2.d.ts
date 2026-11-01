declare module "backblaze-b2" {
  interface UploadUrlResponse {
    data: {
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  interface B2Options {
    applicationKeyId?: string;
    applicationKey?: string;
  }

  class B2 {
    constructor(options?: B2Options);
    authorize(): Promise<any>;
    getUploadUrl(opts: { bucketId: string }): Promise<UploadUrlResponse>;
  }

  export = B2;
}