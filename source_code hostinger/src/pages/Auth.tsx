import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/youbase';

export default function Auth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    client.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/setup');
      }
    });

    if (containerRef.current) {
      client.auth.renderAuthUI(containerRef.current, {
        redirectTo: window.location.origin + '/setup',
        labels: {
          signIn: { title: "Sign In", loginButton: "Access Dashboard" },
          signUp: { title: "Create Account", signUpButton: "Register" }
        }
      });

      // Observer to remove the "Don't have an account?" sign up link
      const observer = new MutationObserver(() => {
        if (!containerRef.current) return;
        
        // Find elements with the specific text
        const allElements = containerRef.current.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
            const text = el.textContent?.toLowerCase() || '';
            if (text.includes("don't have an account") || text.includes("sign up now")) {
              // Hide the parent container usually holding this text and the link
              const container = el.parentElement;
              if (container) container.style.display = 'none';
            }
          }
        });

        // Also look for specific links that might be the button
        const links = containerRef.current.querySelectorAll('a, button');
        links.forEach(link => {
          const text = link.textContent?.toLowerCase() || '';
          if (text.includes('sign up') || text.includes('create account')) {
             // Check if it's not the main submit button (which we labeled "Register" in signUp view, but here we are in signIn view)
             // In signIn view, the button to switch to signUp usually says "Sign up" or "Create account"
             // The main login button says "Access Dashboard"
             if (text !== 'register') { // 'register' is the submit button text we set for signUp view
                 link.style.display = 'none';
                 if (link.parentElement && link.parentElement.innerText.toLowerCase().includes("don't have an account")) {
                     link.parentElement.style.display = 'none';
                 }
             }
          }
        });
      });

      observer.observe(containerRef.current, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
