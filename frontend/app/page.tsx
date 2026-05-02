import { Appbar } from "@/component/Appbar";
import { Hero } from "@/component/hero";
import { HeroVideo } from "@/component/HeroVideo";
import Image from "next/image";

export default function Home() {
  return (
    <main className="pb-48">
        <Appbar />
        <Hero />
        <div className="pt-8">
          <HeroVideo />
        </div>
    </main>
  );
}
