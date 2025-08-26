// src/controllers/contact.controller.js
const inbox = {
  prayers: [],
  contacts: []
};

export const sendPrayer = (req, res) => {
  const { name, phone, message } = req.body;
  const item = { id: Date.now(), name, phone, message, type: "prayer", ts: new Date().toISOString() };
  inbox.prayers.push(item);
  res.status(201).json({ ok: true, id: item.id });
};

export const sendContact = (req, res) => {
  const { name, email, message } = req.body;
  const item = { id: Date.now(), name, email, message, type: "contact", ts: new Date().toISOString() };
  inbox.contacts.push(item);
  res.status(201).json({ ok: true, id: item.id });
};
