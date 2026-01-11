"use client";

import React from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";

type ContainerScrollProps = {
    titleComponent: React.ReactNode;
    children: React.ReactNode;
};

export const ContainerScroll: React.FC<ContainerScrollProps> = ({
    titleComponent,
    children,
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
    });

    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const scaleDimensions = React.useCallback(() => {
        return isMobile ? [0.7, 0.9] : [1, 1.05];
    }, [isMobile]);

    const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
    const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div
            ref={containerRef}
            className="relative flex min-h-[36rem] items-center justify-center p-4 sm:min-h-[42rem] md:h-[72rem] md:p-16 lg:h-[80rem] lg:p-20"
        >
            <div
                className="relative w-full py-12 md:py-40"
                style={{ perspective: "500px" }}
            >
                <Header translate={translate} titleComponent={titleComponent} />
                <Card rotate={rotate} translate={translate} scale={scale}>
                    {children}
                </Card>
            </div>
        </div>
    );
};

type HeaderProps = {
    translate: MotionValue<number>;
    titleComponent: React.ReactNode;
};

export const Header: React.FC<HeaderProps> = ({ translate, titleComponent }) => {
    return (
        <motion.div
            style={{ translateY: translate }}
            className="mx-auto max-w-4xl text-center md:max-w-5xl"
        >
            {titleComponent}
        </motion.div>
    );
};

type CardProps = {
    rotate: MotionValue<number>;
    scale: MotionValue<number>;
    translate: MotionValue<number>;
    children: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ rotate, scale, children }) => {
    return (
        <motion.div
            style={{
                rotateX: rotate,
                scale,
                boxShadow:
                    "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
            }}
            className="mx-auto -mt-10 w-full max-w-5xl rounded-[20px] border-4 border-[#6C6C6C] bg-[#222222] p-3 shadow-2xl sm:-mt-12 sm:p-4 md:-mt-6 md:h-[42rem] md:p-6"
        >
            <div className="h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 p-3 md:p-4">
                {children}
            </div>
        </motion.div>
    );
};

