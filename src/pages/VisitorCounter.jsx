import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/counter/visit", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Counter error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>👁</div>

        <div style={styles.content}>
            <span style={styles.sub}>أنت الزائر رقم</span>
          <span style={styles.number}>
            {count?.toLocaleString()}
          </span>
        
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    marginTop: "40px",
    padding: "0 16px",
    display: "flex",
    justifyContent: "center", // هذا أهم سطر
    boxSizing: "border-box",
  },

  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px 20px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",

    width: "100%",
    maxWidth: "420px", // مناسب للموبايل
    boxSizing: "border-box",
  },

  icon: {
    fontSize: "24px",
    background: "rgba(255,255,255,0.1)",
    padding: "8px",
    borderRadius: "10px",
    flexShrink: 0, // يمنع القص
  },

  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // بالنص بدل flex-end
    textAlign: "center",
  },

  number: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#36eb16",
  },

  sub: {
    fontSize: "18px",
    opacity: 0.9,
  },
};