import ReactMarkdown from "react-markdown";

/** Không nhận HTML thô và ảnh ngoài; link người dùng không truyền uy tín SEO. */
export const Markdown = ({ text }: { text: string }) => (
  <div className="md leading-relaxed">
    <ReactMarkdown
      disallowedElements={["img", "h1"]}
      unwrapDisallowed
      components={{
        a: ({ href, children }) => (
          <a href={href} rel="ugc nofollow noopener" target="_blank">
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
);
