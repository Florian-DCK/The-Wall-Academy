"use client";
import Image from "next/image";
import {useLocale, useTranslations} from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/routing";
import { ReactNode } from "react";
import {Button} from "@/components/ui/button";
import Carousel from "@/components/Carousel";
import type { EmblaOptionsType } from 'embla-carousel';
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react"
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WhatIsItem from "@/components/WhatIsItem";
import { Sparkles, Trophy, Video, Star, Users, Award, MessageSquare, Focus } from "lucide-react";
import NakedLogo from "@/components/NakedLogo";
import BraboLogo from "@/components/BraboLogo";
import TaoLogo from "@/components/TaoLogo";
import FoodMakerLogo from "@/components/FoodMakerLogo";
import HilariousLogo from "@/components/HilariousLogo";
import Link from "next/link";
gsap.registerPlugin(ScrollTrigger);


const Home = () => {
    const t = useTranslations("Home");
    const lang = useLocale();
    const OPTIONS: EmblaOptionsType = { containScroll: false, loop: true, align: 'start' };
    const SLIDE_COUNT = 5
    const SLIDES = Array.from(Array(SLIDE_COUNT).keys())
    const BrandSize = 150;
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

    // label affiché au-dessus des icônes sociales (texte en dur comme demandé)
    const [socialLabel, setSocialLabel] = useState<string>("Suivez-nous :");

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
            <div className="relative flex h-full flex-col justify-center bg-[rgb(253, 253, 253)]">
              <Image
                src={"/naked_VV.png"}
                alt={"Vincent Vanasch X Naked"}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={"object-cover"}
                priority
              />
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
            <div className="relative flex h-full flex-col justify-center gap-5 bg-[rgb(253, 253, 253)]">
              <Image
                src={"/tao_VV.jpeg"}
                alt={"Vincent Vanasch X Naked"}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={"object-cover"}
              />
                <p className={"absolute top-25 -right-5 transform-gpu -rotate-90 italic"} >Energized by <strong>TAO</strong></p>
            </div>
        </section>
        <section id="video" className="w-full h-fit px-0">
            <div className="relative w-full h-[calc(100vh/1.2)] overflow-hidden">
                <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/dTm5ax1g5uE"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </section>
        <section id="footer" className="bg-black min-h-screen pb-40">
            <div className={"grid grid-cols-2"}>
                <div className="flex flex-col justify-center gap-5">
                    <p className="text-8xl text-right font-extrabold uppercase leading-18 text-white">
                        {t.rich("Footer.title", {
                            br: () => <br />,
                            highlight: (chunks) => (
                                <span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
                  {chunks}
                </span>
                            ),
                        })}
                    </p>
                    <div className={"flex flex-col w-fit ml-auto items-center gap-1 mr-2"}>
                        <Image
                            src={"/signature_VV.png"}
                            alt="Signature of Vincent Vanasch"
                            width={120}
                            height={60}
                        />
                        <p className="italic uppercase text-sm">Vincent Vanasch <strong>#21</strong></p>
                    </div>
                </div>
                <div className="flex items-center justify-center overflow-hidden">
                    <Image
                        src={"/vincent_vanasch_footerBanner.jpeg"}
                        width={943}
                        height={1080}
                        alt={"Vincent Vanasch"}
                        className="h-full w-auto object-cover"
                    />
                </div>
            </div>

            <div className={"flex justify-center items-center gap-10 mx-auto w-fit"}>
                 <ul className={"flex gap-10 ml-40 items-center relative"}>
                     <label className={"uppercase text-xl absolute -left-40 text-right transition-all"}>{socialLabel}</label>
                        <Link className={"opacity-50 hover:opacity-100"} href={"https://x.com/vincvanasch21?lang=fr"}><li onMouseEnter={() => setSocialLabel("X - twitter")} onMouseLeave={() => setSocialLabel("Follow me :")}><svg className={"fill-white size-13"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z"/></svg></li></Link>
                        <Link className={"opacity-50 hover:opacity-100"} href={"https://www.instagram.com/vincvanasch21/?hl=fr"}><li onMouseEnter={() => setSocialLabel("Instagram")} onMouseLeave={() => setSocialLabel("Follow me :")}><svg className={"fill-white size-13"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z"/></svg></li></Link>
                        <Link className={"opacity-50 hover:opacity-100"} href={"https://www.facebook.com/VincentVanasch21/?locale=fr_FR"}><li onMouseEnter={() => setSocialLabel("Facebook")} onMouseLeave={() => setSocialLabel("Follow me :")}><svg className={"fill-white size-13"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L258.2 544L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96z"/></svg></li></Link>
                 </ul>
             </div>
            <div>
                <ul className={"flex justify-center items-center opacity-60 gap-10 mx-auto w-fit mt-10"}>
                    <li><NakedLogo width={BrandSize} height={BrandSize}/></li>
                    <li><BraboLogo width={BrandSize} height={BrandSize}/></li>
                    <li><TaoLogo width={BrandSize / 2} height={BrandSize / 2}/></li>
                    <li><FoodMakerLogo width={BrandSize / 2} height={BrandSize / 2}/></li>
                    <li><Image src={"/hockey_player_logo.png"} alt={"Hockey Player"} width={BrandSize} height={BrandSize}/></li>
                    <li><HilariousLogo width={BrandSize} height={BrandSize}/></li>
                </ul>
            </div>
            <p className={"justify-center text-center opacity-60"}>Made with 🧡 by Hilarious © 2023</p>
        </section>
    </main>
  );
};

export default Home;
