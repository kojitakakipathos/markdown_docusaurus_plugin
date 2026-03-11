// theme/Root.js - Plugin-provided theme component
import React, { useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { createRoot } from 'react-dom/client';
import { usePluginData } from '@docusaurus/useGlobalData';
import MarkdownActionsDropdown from '../components/MarkdownActionsDropdown';

export default function Root({ children }) {
  const { hash, pathname } = useLocation();
  const { docsPath } = usePluginData('markdown-source-plugin');
  const dropdownRootRef = useRef(null);

  useEffect(() => {
    if (hash) {
      const scrollToElement = () => {
        const id = decodeURIComponent(hash.substring(1));
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return true;
        }
        return false;
      };

      // Try immediately
      if (!scrollToElement()) {
        // If element not found, wait for images and content to load
        const timeouts = [100, 300, 500, 1000];

        timeouts.forEach(delay => {
          setTimeout(() => {
            scrollToElement();
          }, delay);
        });

        // Also wait for images to load
        window.addEventListener('load', scrollToElement, { once: true });
      }
    }
  }, [hash]);

  // Inject dropdown button into article header
  useEffect(() => {
    const isDocsPage =
      docsPath === '/' ||
      pathname.startsWith(docsPath) ||
      pathname === docsPath.slice(0, -1);

    if (!isDocsPage) return;

    const cleanup = () => {
      if (dropdownRootRef.current) {
        dropdownRootRef.current.unmount();
        dropdownRootRef.current = null;
      }
      const container = document.querySelector('.markdown-actions-container');
      if (container) container.remove();
    };

    const injectDropdown = () => {
      const articleHeader = document.querySelector('article .markdown header');
      if (!articleHeader) return false;

      // Check if already injected
      if (articleHeader.querySelector('.markdown-actions-container')) return true;

      const container = document.createElement('div');
      container.className = 'markdown-actions-container';
      articleHeader.appendChild(container);

      const root = createRoot(container);
      root.render(<MarkdownActionsDropdown />);
      dropdownRootRef.current = root;

      return true;
    };

    // Fast path: header already in DOM (client-side navigation)
    if (injectDropdown()) {
      return cleanup;
    }

    // Cold-load path: observe DOM until header appears after hydration
    const target = document.querySelector('main') || document.body;
    const observer = new MutationObserver(() => {
      if (injectDropdown()) {
        observer.disconnect();
      }
    });

    observer.observe(target, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanup();
    };
  }, [pathname, docsPath]);

  return <>{children}</>;
}
