import "./globals.css";
import Nav from "./Nav";
import AuthGate from "./AuthGate";

export const metadata = { title: "Fly Club Scoring" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main><AuthGate>{children}</AuthGate></main>
      </body>
    </html>
  );
}
