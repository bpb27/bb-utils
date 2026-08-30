# Form data in React

Wrap `createFormDataSchema` in a hook that parses a form's `FormData` on submit
and surfaces typed values plus per-field errors.

## The hook

```tsx
import { useCallback, useState, type FormEvent } from "react";
import type { FormDataSchema, FormSchema, Infer, SchemaIssue } from "bb-utils";

export function useFormData<T extends FormSchema>(
  schema: FormDataSchema<T>,
  onValid: (values: Infer<FormDataSchema<T>>) => void,
) {
  const [issues, setIssues] = useState<readonly SchemaIssue[]>([]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = schema.safeParse(new FormData(event.currentTarget));
      if (result.success) {
        setIssues([]);
        onValid(result.data);
      } else {
        setIssues(result.error.issues);
      }
    },
    [schema, onValid],
  );

  const errorFor = (field: keyof Infer<FormDataSchema<T>>) =>
    issues.find((issue) => issue.field === field)?.message;

  return { onSubmit, errorFor, issues };
}
```

`safeParse` keeps an invalid submit from throwing; `errorFor` reads the first
issue for a field (missing `required`, failed `validate`, wrong type, …).

## In a component

```tsx
import { createFormDataSchema } from "bb-utils";
import { useFormData } from "./use-form-data";

const uploadForm = createFormDataSchema({
  title: { type: "string", required: true },
  tags: { type: "strings" }, // one entry per value (see the multi-select below)
  avatar: { type: "file", validate: (file) => file.size < 5_000_000 || "Max 5MB" },
});

function UploadForm() {
  const { onSubmit, errorFor } = useFormData(uploadForm, async (values) => {
    // values.title: string, values.tags?: string[], values.avatar?: File
    await fetch("/api/upload", { method: "POST", body: uploadForm.serialize(values) });
  });

  return (
    <form onSubmit={onSubmit}>
      <input name="title" />
      {errorFor("title") && <small>{errorFor("title")}</small>}

      {/* array fields read repeated entries — a multi-select submits one per selection */}
      <select name="tags" multiple>
        <option value="react">react</option>
        <option value="ts">ts</option>
      </select>

      <input type="file" name="avatar" />
      {errorFor("avatar") && <small>{errorFor("avatar")}</small>}

      <button>Upload</button>
    </form>
  );
}
```

## Pre-filling an edit form

Because the form is uncontrolled (we `parse` the `FormData` at submit),
pre-filling is just seeding each input's `defaultValue` / `defaultChecked` from
your record — nothing needs to "hydrate". For a **create** form, seed from
`schema.defaults()`; for an **edit** form, seed from the record you're editing.

```tsx
import { createEnum, createFormDataSchema } from "bb-utils";
import { useFormData } from "./use-form-data";

const STATUS = createEnum("draft", "live");
const ALL_TAGS = ["react", "ts", "css"];

const postForm = createFormDataSchema({
  title: { type: "string", required: true },
  status: { type: "enum", enum: STATUS },
  tags: { type: "strings" },
  published: { type: "boolean", default: false }, // default:false → unchecked reads back false
  avatar: { type: "file" },
});

// Your existing record — a domain type, not `Infer<typeof postForm>`
// (for a file you hold a URL, not a `File`).
type Post = {
  title: string;
  status: "draft" | "live";
  tags: string[];
  published: boolean;
  avatarUrl: string | null;
};

function EditPost({ post }: { post: Post }) {
  const { onSubmit, errorFor } = useFormData(postForm, (values) => {
    // An untouched file field is omitted, so your API keeps the existing avatar.
    savePost(values);
  });

  return (
    <form onSubmit={onSubmit}>
      {/* string / number → defaultValue (React stringifies numbers) */}
      <input name="title" defaultValue={post.title} />
      {errorFor("title") && <small>{errorFor("title")}</small>}

      {/* enum → the keys ARE the option values */}
      <select name="status" defaultValue={post.status}>
        {STATUS.keys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      {/* array → multi-select seeded from the current values */}
      <select name="tags" multiple defaultValue={post.tags}>
        {ALL_TAGS.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>

      {/* boolean → see gotcha #1 */}
      <input name="published" type="checkbox" value="true" defaultChecked={post.published} />

      {/* file → see gotcha #2 */}
      {post.avatarUrl && <img src={post.avatarUrl} alt="" />}
      <input name="avatar" type="file" />

      <button>Save</button>
    </form>
  );
}
```

Scalars, enums, and arrays map straight onto DOM values. The two that need care:

1. **Checkboxes** — an unchecked box submits nothing and a checked one submits
   its `value` (default `"on"`, which the boolean codec rejects). Set
   `value="true"` and give the field `default: false`, so "unchecked → absent →
   `false`" falls out of the default handling.
2. **Files** — can't be pre-filled (browser security), and the current value is
   a URL, not a `File` (hence the domain type above). Render it yourself; the
   input is replace-only.

## With react-router actions (data mode)

The same schema parses the request in an action — no hook needed:

```tsx
import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const result = uploadForm.safeParse(await request.formData());
  if (!result.success) return { errors: result.error.issues };
  await save(result.data);
  return { ok: true };
}
```
