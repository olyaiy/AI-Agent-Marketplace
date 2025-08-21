import "./globals.css";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased h-screen flex flex-col`}
      >
        <nav className="h-16 flex items-center px-6 flex-shrink-0">
          <span className="text-xl font-semibold">AV</span>
        </nav>
        
        <div className="flex-1 overflow-hidden mb-8 mx-8">
          {children}
        </div>
      </body>
    </html>
  );
}
