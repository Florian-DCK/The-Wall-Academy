"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";

const Home = () => {
  const t = useTranslations("Home");
  console.log(t);
  return (
    <main>
      <section className="h-screen bg-black flex items-center justify-center">
        <Image
          src={"/vincent-vanasch-left-side.jpeg"}
          width={943}
          height={1080}
          alt={"Vincent Vanasch"}
          className="h-full w-auto border"
        ></Image>
        <p className="text-8xl font-extrabold uppercase leading-18">
          {t.rich("title", {
            br: () => <br />,
            highlight: (chunks) => (
              <span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
                {chunks}
              </span>
            ),
          })}
        </p>
      </section>
    </main>
  );
};

export default Home;
