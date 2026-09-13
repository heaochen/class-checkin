import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AdminLayout from "@/components/AdminLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClassHub | 班级会议管理系统",
  description: "ClassHub 班级会议签到与反馈管理系统",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
