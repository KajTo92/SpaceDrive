import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (request) => {
  const cors = { "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*", "Access-Control-Allow-Headers": "authorization, content-type" };
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:request.headers.get("Authorization")||""}}});
    const {data:{user}}=await caller.auth.getUser(); if(!user) throw new Error("Authentication required");
    const {data:profile}=await caller.from("profiles").select("role").eq("id",user.id).single(); if(profile?.role!=="admin") throw new Error("Admin required");
    const {email,firstName="",lastName=""}=await request.json(); if(!email||!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Valid email required");
    const admin=createClient(url,service,{auth:{persistSession:false}}); const redirectTo=`${Deno.env.get("PUBLIC_SITE_URL")||new URL(request.url).origin}/login.html?invited=driver`;
    const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{first_name:firstName,last_name:lastName}}); if(error) throw error;
    if(data.user){await admin.from("profiles").update({role:"driver"}).eq("id",data.user.id);await admin.from("driver_profiles").upsert({user_id:data.user.id,availability_status:"offline"});}
    return Response.json({ok:true},{headers:cors});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"Invitation failed"},{status:400,headers:cors}); }
});
