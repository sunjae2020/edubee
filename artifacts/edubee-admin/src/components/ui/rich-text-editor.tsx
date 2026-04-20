import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Link as LinkIcon, Unlink,
  RotateCcw, RotateCw,
} from "lucide-react";
import { useCallback, useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarBtn({
  active, onClick, title, children, disabled,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors text-sm
        ${active
          ? "bg-(--e-orange) text-white"
          : "text-[#57534E] hover:bg-(--e-orange)/10 hover:text-(--e-orange)"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#E8E6E2] mx-0.5 self-center" />;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write a detailed product description…",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current !== incoming && incoming !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(incoming);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-[#E8E6E2] overflow-hidden focus-within:border-(--e-orange) focus-within:shadow-[0_0_0_3px_var(--e-orange-ring)] transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#E8E6E2] bg-[#FAFAF9]">

        {/* History */}
        <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <RotateCcw className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <RotateCw className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Text style */}
        <ToolbarBtn title="Bold" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn title="Align Left" active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Align Center" active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Align Right" active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Justify" active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn title="Bullet List" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Ordered List" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Horizontal Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Link */}
        <ToolbarBtn title="Add / Edit Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Remove Link"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 focus:outline-none text-sm text-[#1C1917]"
        style={{ minHeight }}
      />
    </div>
  );
}
