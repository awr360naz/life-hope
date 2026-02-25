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
    padding: "0 20px",
  },

  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center", 
    gap: "15px",
    padding: "18px 28px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    width: "100%",          
    maxWidth: "500px",     
    margin: "0 auto",      
  },

  icon: {
    fontSize: "28px",
    background: "rgba(255,255,255,0.1)",
    padding: "10px",
    borderRadius: "10px",
  },

  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },

  label: {
    fontSize: "12px",
    opacity: 0.7,
  },

  number: {
    fontSize: "26px",
    fontWeight: "bold",
    color: "#36eb16",
  },

  sub: {
    fontSize: "18px",
    opacity: 0.8,
  },
  
};