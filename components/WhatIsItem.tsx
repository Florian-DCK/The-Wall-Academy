import React from 'react';
import { useTranslations } from 'next-intl';
import { LucideIcon } from 'lucide-react';

interface WhatIsItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

const WhatIsItem: React.FC<WhatIsItemProps> = ({ icon: Icon, title, description, className }) => {
    const t = useTranslations('Home.WhatIs.WhatIsItems');
  return (
    <div className={`whatIsItem ${className || ''}`}>
      <div className="whatIsItemHeader flex gap-4">
        <Icon className="size-7 icon-gradient" />
        <h3 className="whatIsItemTitle text-xl font-bold mb-2">
            {t(title)}
        </h3>
      </div>
      <p className="whatIsItemDescription text-black">
        {t(description)}
      </p>
      <hr className='w-1/3 mt-4 border-2 rounded-full' />
    </div>
  );
};

export default WhatIsItem;
