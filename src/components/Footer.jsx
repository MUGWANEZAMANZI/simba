import React, { useState, useEffect } from 'react';

const FAQ = ({ t }) => {
  const faqs = [
    {
      question: t.faq1Q || "What are Simba Supermarket's delivery hours?",
      answer: t.faq1A || "We deliver every day from 6:00 AM to 9:00 PM (21:00)."
    },
    {
      question: t.faq2Q || "How can I track my order?",
      answer: t.faq2A || "You can track your order in the 'Profile' section after logging in with your phone number."
    },
    {
      question: t.faq3Q || "What payment methods do you accept?",
      answer: t.faq3A || "We accept Mobile Money (MoMo), Cash on delivery, and Card on delivery."
    },
    {
      question: t.faq4Q || "Do you offer same-day delivery?",
      answer: t.faq4A || "Yes, we offer same-day delivery in Kigali on eligible orders."
    }
  ];

  return (
    <section id="faq" className="faq-section card">
      <div className="section-heading">
        <h3>{t.faqTitle || "Frequently Asked Questions"}</h3>
      </div>
      <div className="faq-grid">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <h4>{faq.question}</h4>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Footer = ({ t }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="footer">
      <FAQ t={t} />
      <div className="footer-info-row">
        <a href="#faq">{t.faqLink || "FAQ"}</a>
        <span>{t.currentTimeLabel || "Current Time"}: {currentTime}</span>
        <span>{t.deliveryHoursLabel || "Delivery Hours"}: 6:00 AM - 21:00 PM</span>
      </div>
    </footer>
  );
};

export default Footer;
