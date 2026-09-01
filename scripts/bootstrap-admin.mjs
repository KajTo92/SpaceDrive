import { createClient } from "@supabase/supabase-js";
const [email]=process.argv.slice(2),url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!email||!url||!serviceRole){console.error("Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-admin.mjs verified@example.com");process.exit(1);}
const supabase=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});let page=1,user;
while(!user){const{data,error}=await supabase.auth.admin.listUsers({page,perPage:1000});if(error)throw error;user=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());if(user||data.users.length<1000)break;page++;}
if(!user?.email_confirmed_at)throw new Error("A verified Auth user with that email was not found.");
const{error}=await supabase.from("profiles").update({role:"admin"}).eq("id",user.id);if(error)throw error;console.log(`Admin role granted to verified user ${email}.`);
