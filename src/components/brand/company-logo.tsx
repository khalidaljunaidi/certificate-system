import Image from "next/image";

import { COMPANY_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type CompanyLogoProps = {
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
};

export function CompanyLogo({
  width = 72,
  height = 72,
  priority = false,
  className,
}: CompanyLogoProps) {
  return (
    <Image
      src={COMPANY_LOGO_PATH}
      alt="The Gathering KSA logo"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto", className)}
    />
  );
}
