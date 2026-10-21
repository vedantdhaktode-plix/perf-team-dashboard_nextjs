import "./globals.css";

export const metadata = {
  title: "Perf Team Dashboard",
  description: "Performance team go-live operations dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
