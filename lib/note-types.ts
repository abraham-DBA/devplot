export type NoteEntry = {
  id: string;
  type: "technical" | "implementation" | "schema" | "api" | "review";
  title: string;
  body: string;
  createdAt: string;
};
