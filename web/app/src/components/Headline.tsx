export function Headline({ text, dek }: { text: string; dek?: string }) {
  return (
    <>
      <h1 className="h enter" key={text}>{text}</h1>
      {dek && <p className="dek">{dek}</p>}
    </>
  );
}
