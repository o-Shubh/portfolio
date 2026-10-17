// Storage paths for book files (no imports, so it is unit tested directly).
export type FileKind = "manuscript" | "print_cover" | "cover";
const FILE_STEM: Record<FileKind, string> = { manuscript: "manuscript", print_cover: "print-cover", cover: "cover" };
export const versionedPath = (authorId: string, bookId: string, kind: FileKind, ext: string) =>
  `${authorId}/${bookId}/${FILE_STEM[kind]}-${crypto.randomUUID()}.${ext}`;
export const isBookFilePath = (path: string, authorId: string, bookId: string, kind: FileKind, ext: string) =>
  path.startsWith(`${authorId}/${bookId}/${FILE_STEM[kind]}`) &&
  new RegExp(`^${authorId}/${bookId}/${FILE_STEM[kind]}(-[0-9a-f-]{36})?\\.${ext}$`).test(path);
