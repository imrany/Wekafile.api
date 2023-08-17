//preloader
const loader={
    on:()=>{
        const loader=document.querySelector('.preload')
        loader.style.display='block';
    },
    off:()=>{
        const loader=document.querySelector('.preload')
        loader.style.display='none';
    }
}

export{
    loader
}