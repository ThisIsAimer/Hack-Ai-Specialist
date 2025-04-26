'use client';
import Link from 'next/link';


import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import Slider from 'react-slick';
import Image from 'next/image';

interface DashboardItem {
    id: string;
    name: string;
    description: string;
    image: string;
  }
  
  interface DashboardData {
    data: DashboardItem[]; // now accepts multiple items
  }




export default function DashboardSelect({data}:DashboardData) {
    const settings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        responsive: [
        
            {
                breakpoint: 1000,
                settings: {
                    slidesToShow: 2,
                }
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1,
                }
            }
        ]
      };

    return (
        <>    
        <div className=" w-8/10 m-auto rounded-2xl shadow-lg">
            <Slider {...settings} >
                {data.map( (items,index) =>
                    <div key={index} className="bg-white h-[450px] text-black rounded-xl">
                        <div className="h-56 rounded-t-xl bg-indigo-500 flex justify-center items-center">
                        <Image src={items.image} alt={items.name} className="w-44 h-44 rounded-full" width={350} height={350} />
                        </div>

                        <div className="flex flex-col justify-center items-center gap-4 p-4 mt-1">
                            <Link href={"/dashboard/"+items.id} >
                                <div className="text-white">
                                    <button className="text-3xl font-bold bg-indigo-600 px-5 pb-1 hover:cursor-pointer hover:bg-indigo-700 rounded-xl">{items.name}</button>
                                </div>
                            </Link>
                            <div>
                                <p className='text-xs font-bold overflow-hidden line-clamp-8'>{items.description}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Slider>
        </div>
        </>
    );
}