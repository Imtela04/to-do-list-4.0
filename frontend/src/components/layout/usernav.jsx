import { User, Power, LogOut } from 'lucide-react'
import styles from './usernav.module.css';
export default function UserNav(){
  // const 
  return(
    <div className='parent'>
      <button><User/></button>
      <button className='log' ><Power/></button>
      {/* <button><User/></button> */}
    </div>
    

  );
}