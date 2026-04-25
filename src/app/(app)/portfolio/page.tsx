import type { Metadata } from "next";
import { PortfolioView } from "@/components/pages/(app)";

export const metadata: Metadata = {
  title: "Mondo | Portfolio",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
