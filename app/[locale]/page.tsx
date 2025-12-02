"use client";
import Image from "next/image";
import {useLocale, useTranslations} from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/routing";
import { ReactNode } from "react";
import {Button} from "@/components/ui/button";
import Carousel from "@/components/Carousel";
import type { EmblaOptionsType } from 'embla-carousel';
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react"
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WhatIsItem from "@/components/WhatIsItem";
import { Sparkles, Trophy, Video, Star, Users, Award, MessageSquare, Focus } from "lucide-react";
gsap.registerPlugin(ScrollTrigger);


const Home = () => {
    const t = useTranslations("Home");
    const lang = useLocale();
    const OPTIONS: EmblaOptionsType = { containScroll: false, loop: true, align: 'start' };
    const SLIDE_COUNT = 5
    const SLIDES = Array.from(Array(SLIDE_COUNT).keys())
    const WhatIsItems = [
      {
        icon: Sparkles,
        title: "atelierTitle",
        description: "atelierDescription"
      },
      {
        icon: Trophy,
        title: "wallTitle",
        description: "wallDescription"
      },
      {
        icon: Video,
        title: "videoTitle",
        description: "videoDescription"
      },
      {
        icon: Star,
        title: "experienceTitle",
        description: "experienceDescription"
      },
      {
        icon: Users,
        title: "smallGroupTitle",
        description: "smallGroupDescription"
      },
      {
        icon: Award,
        title: "staffTitle",
        description: "staffDescription"
      },
      {
        icon: MessageSquare,
        title: "coachingTitle",
        description: "coachingDescription"
      },
      {
        icon: Focus,
        title: "concentrationTitle",
        description: "concentrationDescription"
      }
    ]
    const chunks = {
        br: () => <div className="-mb-3" />,
        highlight: (chunks: ReactNode) => (
            <span className="highlight">{chunks}</span>
        ),
        strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
        faded: (chunks: ReactNode) => <span className="text-gray-400">{chunks}</span>,
        small: (chunks: ReactNode) => <small className="text-sm font-medium leading-tight block">{chunks}</small>,

    };

    useGSAP(() => {
      const items = gsap.utils.toArray(".whatIsItem");
      items.forEach((item: any) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
        });
      });
    });

    return (
    <main>
        <section id="landing" className="h-screen bg-black grid grid-cols-2">
          <Image src={"/brandLogo.png"} alt={"The wall academy logo"} width={400} height={400} className="absolute top-8 left-10 w-40 h-auto object-contain"/>
        <div className="flex items-center justify-end overflow-hidden">
          <Image
            src={"/vincent-vanasch-left-side.jpeg"}
            width={943}
            height={1080}
            alt={"Vincent Vanasch"}
            className="h-full w-auto object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-5">
          <p className="text-8xl font-extrabold uppercase leading-18 text-white">
            {t.rich("title", {
              br: () => <br />,
              highlight: (chunks) => (
                <span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </p>
          <div className={"flex flex-col w-fit items-center gap-1 ml-2"}>
            <Image
              src={"/signature_VV.png"}
              alt="Signature of Vincent Vanasch"
              width={120}
              height={60}
            />
            <p className="italic uppercase text-sm">Vincent Vanasch <strong>#21</strong></p>
          </div>
        </div>
          <div className={"absolute top-8 right-10 flex gap-4 items-end"}>
              {SUPPORTED_LOCALES.filter((item) => item !== lang).map((item, i) => (
                    <a key={i} href={`/${item}`} className={'uppercase text-sm font-bold hover:underline'} >
                        {item}
                    </a>
              ))}
          </div>
        </section>
        <section id="mainCTA" className="h-screen bg-[#fdfcff] overflow-hidden text-black grid grid-cols-2 items-center-safe">
            <div className="flex flex-col overflow-hidden gap-8">
                <p className={"text-4xl text-right font-extrabold uppercase"}>
                    {t.rich("headline1", chunks)}
                </p>
                <p className={"text-right text-3xl"}>
                    {t.rich("description1", chunks)}
                </p>
                <Button className={"w-fit self-end  text-lg font-bold shadow-none tracking-tight"}>{t("CTA")}</Button>
            </div>
            <div className="relative flex flex-col justify-center gap-5 bg-[rgb(253, 253, 253)]">
                <Image src={"/naked_VV.png"} alt={"Vincent Vanasch X Naked"} height={709} width={703} className={"h-full w-auto object-cover"}/>
                <p className={"absolute top-25 -right-5 transform-gpu -rotate-90 italic"} >Energized by <strong>NAKED</strong></p>
            </div>
        </section>
        <section id="testimony" className="h-screen bg-white text-black grid-cols-2 flex items-center justify-center">
            <Carousel slides={SLIDES} options={OPTIONS}/>
        </section>
        <section id="whatIs" className="min-h-screen w-2/3 mx-auto py-20 px-10 text-black">
            <div className="grid grid-cols-2 gap-10 max-w-7xl mx-auto">
                <div className="relative">
                    <h2 className="text-3xl font-extrabold uppercase sticky top-10 text-right [&_div]:-mb-1">
                        {t.rich("WhatIs.title", chunks)}
                    </h2>
                </div>
                <div id="whatIsList">
                    <ul className="flex flex-col gap-20">
                        {WhatIsItems.map((item, i) => (
                            <WhatIsItem key={i} icon={item.icon} title={item.title} description={item.description} className={i % 2 === 1 ? "ml-20" : ""} />
                        ))}
                    </ul>
                </div>
            </div>
        </section>
        <section id="campCTA" className="h-screen overflow-hidden text-black grid grid-cols-2 items-center-safe">
              <div className="flex flex-col overflow-hidden">
                <p className={"text-4xl text-right font-extrabold uppercase mb-20 leading-tight"}>
                    {t.rich("headline2", chunks)}
                </p>
                <p className={"text-right text-3xl font-extrabold uppercase mr-10 mb-10 [&_div]:mb-0"}>
                    {t.rich("description2", chunks)}
                </p>
                <Button className={"w-fit self-end  text-lg font-bold shadow-none tracking-tight mr-10"}>{t("CTA")}</Button>
            </div>
            <div className="relative flex flex-col justify-center gap-5 bg-[rgb(253, 253, 253)]">
                <Image src={"/tao_VV.jpeg"} alt={"Vincent Vanasch X Naked"} height={709} width={703} className={"h-full w-auto object-cover"}/>
                <p className={"absolute top-25 -right-5 transform-gpu -rotate-90 italic"} >Energized by <strong>TAO</strong></p>
            </div>
        </section>
        <section id="video">

        </section>
        <section id="footer" className="bg-black">

        </section>
    </main>
  );
};

export default Home;
