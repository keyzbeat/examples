import { Storytelling } from "@/components/home/Storytelling";
import { ListingsPreview } from "@/components/home/ListingsPreview";
import { StatsCounter } from "@/components/home/StatsCounter";
import { ServicesSection } from "@/components/home/ServicesSection";
import { SoldSection } from "@/components/home/SoldSection";
import { ContactQuick } from "@/components/home/ContactQuick";

export default function HomePage() {
  return (
    <>
      <Storytelling />
      <ListingsPreview />
      <StatsCounter />
      <ServicesSection />
      <SoldSection />
      <ContactQuick />
    </>
  );
}
