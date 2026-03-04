import React, { createContext, useContext, useState } from "react";

export type ColorTheme = "violet" | "blue" | "rose" | "orange" | "green";

interface ThemeColorContextType {
    colorTheme: ColorTheme;
    setColorTheme: (color: ColorTheme) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export const useThemeColor = () => {
    const context = useContext(ThemeColorContext);
    if (!context) throw new Error("useThemeColor must be used within ThemeColorProvider");
    return context;
};

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
        // Default to 'violet' if not set
        const saved = localStorage.getItem("color-theme");
        return (saved as ColorTheme) || "violet";
    });

    const setColorTheme = (color: ColorTheme) => {
        setColorThemeState(color);
        localStorage.setItem("color-theme", color);
    };

    return (
        <ThemeColorContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ThemeColorContext.Provider>
    );
}
