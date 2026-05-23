export type Category = {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  parentId: string | null;
  position: number;
  createdAt: string;
};

export type Link = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  categoryId: string | null;
  createdAt: string;
};

export type CategoryNode = Category & {
  children: CategoryNode[];
  links: Link[];
};
