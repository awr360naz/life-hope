// src/controllers/content.controller.js
export const getLive = (_req, res) => {
  const live = {
    title: "البث المباشر",
    iframeSrc: "https://closeradio.tv/awrara/", // بدّليه إذا لزم
  };
  res.json(live);
};

export const getArticles = (_req, res) => {
  const items = [
    { id: 1, title: "مقال 1", slug: "article-1", summary: "ملخّص قصير", image: "/images/a1.jpg" },
    { id: 2, title: "مقال 2", slug: "article-2", summary: "ملخّص قصير", image: "/images/a2.jpg" },
  ];
  res.json(items);
};

export const getPrograms = (_req, res) => {
  const items = [
    { id: 1, title: "برنامج 1", time: "18:00", image: "/images/p1.jpg" },
    { id: 2, title: "برنامج 2", time: "19:00", image: "/images/p2.jpg" },
  ];
  res.json(items);
};
