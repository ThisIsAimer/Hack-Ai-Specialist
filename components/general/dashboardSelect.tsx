'use client';
import Link from 'next/link';


import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import Slider from 'react-slick';
import Image from 'next/image';
import { Button } from '../ui/button';

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
    };

    return (
        <>    
        <div className="p-8 m-auto rounded-2xl shadow-md bg-gray-200/60 ">
            <Slider {...settings} >
                {data.map( (items,index) =>
                    <div key={index} className="text-black rounded-xl pb-6 pt-4">
                        <div className=" rounded-t-xl flex justify-center items-center">
                        <Image src={items.image} alt={items.name} className="w-44 h-44 rounded-full" width={350} height={350} />
                        </div>

                        <div className="flex flex-col justify-center items-center gap-4 py-2 px-6 ">
                            
                            <div className="">
                                <button className="text-3xl font-bold ">{items.name}</button>
                            </div>
                            
                            <div >
                                <p className='text-md text-center w-44 text-gray-600'>{items.description}</p>
                            </div>
                        </div>
                        <Link href={"/dashboard/"+items.id}  >
                            <div className="flex justify-center">
                                <Button variant={'link'} className="text-white mt-4 text-base sm:text-lg lg:text-xl rounded-md px-8 sm:px-10 lg:px-8 py-6 sm:py-7 lg:py-6 bg-indigo-600 hover:from-indigo-600 hover:to-slate-800 transition-all duration-200 hover:no-underline shadow-lg cursor-pointer">
                                    
                                    <span>
                                        Talk Now
                                    </span>
                                  
                                </Button>

                            </div>
                        </Link>
                    </div>
                )}
            </Slider>
        </div>
        </>
    );
}