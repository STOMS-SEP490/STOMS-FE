// import { X } from "lucide-react";
// import { useEffect, useState } from "react";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { Switch } from "@/components/ui/switch";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import type { MemberDetail } from "@/types/user";
// import { ROLE_MAP } from "@/constants/role";

// type Props = {
//   open: boolean;
//   onClose: () => void;
//   member: MemberDetail | null;
//   onUpdated?: () => void;
// };

// export default function RightSidebarUserEdit({
//   open,
//   onClose,
//   member,
//   onUpdated,
// }: Props) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isActive, setIsActive] = useState(true);
//   const [roleId, setRoleId] = useState<number | undefined>();
//   const [teamId, setTeamId] = useState<number | undefined>();
//   const [skills, setSkills] = useState<string[]>([]);

//   useEffect(() => {
//     if (!member) return;

//     setEmail(member.user?.email ?? "");
//     setIsActive(member.user?.isActive ?? true);
//     setRoleId(member.user?.roleId);
//     setTeamId(member.teamId);
//     setSkills(member.skills ?? []);
//   }, [member]);

//   if (!member) return null;

//   const handleSubmit = async () => {
//     const payload = {
//       email,
//       passwordHash: password || undefined,
//       isActive,
//       lockedAt: isActive ? null : new Date().toISOString(),
//       roleId,
//     };

//     await fetch(`/api/users/${member.user?.userId}`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     onUpdated?.();
//     onClose();
//   };

//   return (
//     <>
//       {open && (
//         <div
//           className="fixed inset-0 bg-black/30 z-40"
//           onClick={onClose}
//         />
//       )}

//       <div
//         className={`fixed top-0 right-0 h-full w-[600px] bg-[#f3f4f6] z-50 transition-transform duration-300 ${
//           open ? "translate-x-0" : "translate-x-full"
//         }`}
//       >
//         <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">

//           {/* HEADER */}
//           <div className="px-8 py-6 bg-[#f3f4f6]">
//             <div className="flex justify-between items-start">
//               <h2 className="text-lg font-semibold">
//                 Chỉnh sửa thành viên
//               </h2>

//               <button onClick={onClose}>
//                 <X size={20} />
//               </button>
//             </div>
//           </div>

//           {/* ACCOUNT INFO */}
//           <Section title="Thông tin tài khoản">

//             <Field label="Email">
//               <Input
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//               />
//             </Field>

//             <Field label="Mật khẩu mới">
//               <Input
//                 type="password"
//                 placeholder="Để trống nếu không đổi"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//               />
//             </Field>

//             <Field label="Vai trò">
//               <Select
//                 value={roleId?.toString()}
//                 onValueChange={(val) => setRoleId(Number(val))}
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {Object.entries(ROLE_MAP).map(([id, label]) => (
//                     <SelectItem key={id} value={id}>
//                       {label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </Field>

//             <Field label="Trạng thái">
//               <Switch
//                 checked={isActive}
//                 onCheckedChange={setIsActive}
//               />
//             </Field>
//           </Section>

//           {/* MEMBER INFO */}
//           <Section title="Thông tin bổ sung">

//             <Field label="Team ID">
//               <Input
//                 type="number"
//                 value={teamId}
//                 onChange={(e) => setTeamId(Number(e.target.value))}
//               />
//             </Field>

//             <Field label="Kỹ năng">
//               <SkillEditor skills={skills} setSkills={setSkills} />
//             </Field>

//           </Section>

//           <div className="p-6">
//             <Button
//               className="w-full"
//               onClick={handleSubmit}
//             >
//               Lưu thay đổi
//             </Button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// function Section({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="p-6 bg-white rounded-xl shadow-sm mx-6 m-2 space-y-4">
//       <h3 className="font-semibold">{title}</h3>
//       <div className="grid grid-cols-2 gap-4 text-sm">
//         {children}
//       </div>
//     </div>
//   );
// }

// function Field({
//   label,
//   children,
// }: {
//   label: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div>
//       <p className="text-xs text-gray-400 mb-1">{label}</p>
//       <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
//         {children}
//       </div>
//     </div>
//   );
// }
