import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowDownTrayIcon, DocumentArrowUpIcon, ShieldCheckIcon, BoltIcon } from "@heroicons/react/24/outline";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some((e: any) => e.code === "file-too-large")) {
        setError("File size exceeds 5MB limit.");
      } else if (rejection.errors.some((e: any) => e.code === "file-invalid-type")) {
        setError("Only PDF files are supported.");
      } else {
        setError("Invalid file upload. Please check your file.");
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      handleUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [] },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
  
      const contentType = res.headers.get("content-type") || "";
  
      if (!res.ok) {
        const errorDetails = await res.text();
        throw new Error(errorDetails || "Upload failed.");
      }
  
      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected server response.");
      }
  
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900 flex flex-col items-center justify-start px-6 py-16 font-sans">
      <header className="w-full max-w-7xl flex items-center justify-between mb-12 animate-fade-in">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">ParseBank</h1>
        <nav className="space-x-6 text-sm font-semibold text-gray-600">
          <a href="#features" className="hover:text-blue-700 transition">Features</a>
          <a href="#security" className="hover:text-blue-700 transition">Security</a>
          <a href="#faq" className="hover:text-blue-700 transition">FAQ</a>
        </nav>
      </header>

      <div className="w-full max-w-4xl text-center mb-12 animate-slide-up">
        <h2 className="text-5xl font-extrabold text-blue-800 tracking-tight mb-4 leading-tight">Convert Bank Statements to Excel. In Seconds.</h2>
        <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">Drag and drop a PDF. Get a clean, professional Excel file instantly. Built for mortgage pros, underwriters, and fintech teams that move fast.</p>
      </div>

      <div className="w-full max-w-4xl bg-white shadow-xl border border-gray-200 rounded-3xl p-10 transition-transform duration-300 ease-in-out hover:scale-[1.01] animate-fade-in">
        <div {...getRootProps()} className="border-2 border-dashed border-blue-300 bg-slate-50 hover:bg-slate-100 transition-all p-12 rounded-xl cursor-pointer flex flex-col items-center justify-center">
          <input {...getInputProps()} />
          <DocumentArrowUpIcon className="w-12 h-12 text-blue-500 mb-3 animate-bounce-slow" />
          {file ? (
            <p className="text-sm font-medium text-blue-700">{file.name}</p>
          ) : (
            <p className="text-md text-blue-600">Click or drag a PDF bank statement to upload</p>
          )}
        </div>

        {loading && <p className="mt-6 text-blue-600 text-center font-medium animate-pulse">Processing your file...</p>}
        {error && <p className="mt-6 text-red-600 text-center font-medium">{error}</p>}

        {downloadUrl && (
          <div className="mt-8 text-center animate-fade-in">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download Excel File
            </a>
          </div>
        )}
      </div>

      <section id="features" className="mt-24 w-full max-w-5xl animate-fade-in">
        <h3 className="text-3xl font-bold text-blue-800 mb-6">Why ParseBank?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-600">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <BoltIcon className="w-6 h-6 text-blue-600 mb-3" />
            <h4 className="font-semibold mb-1">Lightning Fast</h4>
            <p>Upload a PDF and get structured Excel output in under 5 seconds. No login. No fluff.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600 mb-3" />
            <h4 className="font-semibold mb-1">Secure by Default</h4>
            <p>Your files are never stored. Everything runs locally and deletes after processing.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <DocumentArrowUpIcon className="w-6 h-6 text-blue-600 mb-3" />
            <h4 className="font-semibold mb-1">Mortgage Ready</h4>
            <p>Perfectly formatted Excel outputs tailored for underwriters, brokers, and analysts.</p>
          </div>
        </div>
      </section>

      <section id="security" className="mt-24 w-full max-w-3xl text-center animate-fade-in">
        <h3 className="text-3xl font-bold text-blue-800 mb-4">Privacy First</h3>
        <p className="text-slate-600">We don't store your data. We don't track you. We just parse your bank statement and give you clean data — fast. Your files are deleted immediately after download is prepared.</p>
      </section>

      <section id="faq" className="mt-24 w-full max-w-3xl animate-fade-in">
        <h3 className="text-3xl font-bold text-blue-800 mb-6">FAQs</h3>
        <div className="space-y-6 text-sm text-gray-700">
          <div>
            <p className="font-semibold">What types of PDFs are supported?</p>
            <p>Bank statements with tabular formats — most major U.S. banks and international PDFs work.</p>
          </div>
          <div>
            <p className="font-semibold">Is my data stored?</p>
            <p>No. ParseBank does not store or log your uploads. Everything is processed in memory.</p>
          </div>
          <div>
            <p className="font-semibold">Can I use this for client work?</p>
            <p>Absolutely. This tool was built with analysts, mortgage officers, and tax preparers in mind.</p>
          </div>
        </div>
      </section>

      <footer className="mt-32 py-10 border-t w-full text-sm text-slate-500 text-center animate-fade-in">
        © 2025 ParseBank · Built for professionals · All rights reserved
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out both;
        }
        .animate-slide-up {
          animation: fade-in 0.8s ease-out both;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
