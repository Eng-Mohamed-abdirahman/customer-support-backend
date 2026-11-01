import multer from "multer";

const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Only PNG, JPEG, and SVG files are allowed"));
      return;
    }

    cb(null, true);
  },
});

export default upload;