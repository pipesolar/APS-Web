import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>
          Engineered by{' '}
          <a 
            href="https://pipe.solar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            Pipe Solar
          </a>
        </p>
        <p className="copyright">© {new Date().getFullYear()} Pipe Solar. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
