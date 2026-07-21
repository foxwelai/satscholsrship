/* Print-faithful English replica of the official Kannada scholarship
   application of Shrimath Ananteshwar Temple, Manjeshwar (Kerala).
   Renders blank when no student is passed; renders filled otherwise. */

export type StudentData = Partial<{
  student_id: string;
  name: string;
  mobile: string;
  dob: string;
  aadhar: string;
  category: string;
  current_class: string;
  prev_year_marks: string;
  financial_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  father_name: string;
  address: string;
  mother_name: string;
  mother_occupation: string;
  family_income: string;
  contact_phone: string;
  bank_account: string;
  bank_name: string;
  bank_branch: string;
  ifsc: string;
  annual_fee: string;
  pete_name: string;
  photo_path: string;
  created_at: string;
}>;

function Line({ value, className = "" }: { value?: string; className?: string }) {
  return (
    <span className={`dotted-line px-1 font-semibold text-blue-900 ${className}`}>
      {value || " "}
    </span>
  );
}

function Field({ label, value, className = "" }: { label: string; value?: string; className?: string }) {
  return (
    <div className={`flex items-end gap-1 ${className}`}>
      <span className="whitespace-nowrap">{label}</span>
      <Line value={value} />
    </div>
  );
}

const PETE_MEMBERS: [string, string, string, string, string, string][] = [
  ["Manjeshwar", "Devadas Prabhu", "9020155656", "Bantwala", "S. Subraya Nayak", "9964552790"],
  ["Hosdurg", "Pratheep Pai H.", "9447878577", "Belthangady", "Shasidhar Pai R. B.", "9900494153"],
  ["Kasaragod", "K. Sanjay Kamath", "9495345206", "Puttur", "M. Dinesh Kamath", "8861021147"],
  ["Kundapur", "Mallinath Kamath", "9538382777", "Bellare", "K. Ashok Prabhu", "9343293764"],
  ["Gangolli", "B. Prakash Padiyar", "9620334274", "Mulky", "V. Shivaram Kamath", "9845082607"],
  ["Udupi", "Vishal Shenoy P.", "9880901832", "Gurpur", "G. Krishnananda Pai", "9449770505"],
  ["Kaup", "Rajendra Bhat", "9845353179", "Mangalore-1", "G. Gopalakrishna Kamath", "9886749779"],
  ["Karkala", "M. Premananda Pai", "9448151467", "Mangalore-2", "P. Sudhir Bhagath", "9980159151"],
  ["Moodabidri", "B. Raghavendra Kamath", "9620370757", "Ullal", "M. Anil Pai", "9591857157"],
];

export default function ScholarshipForm({ student = {} }: { student?: StudentData }) {
  const s = student;
  const appDate = s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN") : "";
  return (
    <div className="mx-auto max-w-[210mm] bg-white text-[13px] leading-snug text-gray-900 shadow print:shadow-none">
      {/* ============ PAGE 1 ============ */}
      <div className="border-2 border-red-700 p-6 print:break-after-page">
        {/* Header */}
        <div className="text-center">
          <p className="text-[11px] font-semibold text-red-800">|| Shri Bhadram Prasannaha ||</p>
          <div className="mt-1 flex items-start justify-between">
            <div className="w-16 pt-1 text-3xl text-red-800">🛕</div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-red-800">
                Shrimath Ananteshwar Temple, Manjeshwar (Kerala)
              </h1>
              <p className="text-[11px] text-red-700">
                (For Gowda Saraswat Brahmin Community Students Only)
              </p>
            </div>
            <div className="w-32 text-right text-[11px] font-semibold text-red-800">
              Ph: 04998-272221
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-y border-red-700 py-1.5">
          <div className="flex items-end gap-1">
            <span className="font-bold">No.</span>
            <span className="min-w-24 border-b border-dotted border-gray-500 px-2 text-center font-bold text-red-700">
              {s.student_id || " "}
            </span>
          </div>
          <div className="text-center">
            <span className="border-2 border-red-700 px-4 py-0.5 text-base font-bold text-red-800">
              Student Scholarship Application
            </span>
            <p className="mt-0.5 text-[10px] text-red-700">(Only for deserving backward-class applicants)</p>
            {s.financial_year && (
              <p className="mt-0.5 text-[11px] font-bold text-red-800">Financial Year: {s.financial_year}</p>
            )}
          </div>
          <div className="flex items-end gap-1">
            <span className="font-bold">Date</span>
            <span className="min-w-24 border-b border-dotted border-gray-500 px-2 text-center">
              {appDate || " "}
            </span>
          </div>
        </div>

        {/* Preamble */}
        <p className="mt-3 text-justify text-[12px]">
          Poor and economically backward students of the Gowda Saraswat Brahmin community who are
          pursuing higher education may apply to the Administrative Committee of Shrimath
          Ananteshwar Temple, Manjeshwar, in the prescribed application form (Student Scholarship)
          as per the rules and conditions mentioned below. Eligible students are requested to
          submit their applications accordingly.
        </p>

        {/* Section A */}
        <h2 className="mt-3 font-bold">A) Student Details :</h2>
        <div className="mt-1 flex gap-4">
          <div className="flex-1 space-y-2.5">
            <div>
              <p>
                1) Whether the student belongs to any of the 18 Petes under Shrimath Ananteshwar
                Temple, Manjeshwar
              </p>
              <Field label="(If yes, specify the Pete name) :" value={s.pete_name} />
            </div>
            <Field label="2) Student's Name (Name) :" value={s.name} />
            <Field label="Mobile No. :" value={s.mobile} className="pl-4" />
            <Field label="3) Date of Birth (D.O.B.) :" value={s.dob} />
            <Field label="4) Class / Course studying in the current year :" value={s.current_class} />
          </div>
          <div className="flex h-40 w-32 shrink-0 items-center justify-center border-2 border-blue-800 text-center text-[11px] text-gray-500">
            {s.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo_path} alt="Student photo" className="h-full w-full object-cover" />
            ) : (
              <span>
                Photo
                <br />
                (ಭಾವಚಿತ್ರ)
              </span>
            )}
          </div>
        </div>
        <div className="mt-2.5 space-y-2.5">
          <Field
            label="5) Marks / Percentage and Grade obtained in the previous year :"
            value={s.prev_year_marks}
          />
          <Field
            label="6) Name and address of School / College : / Phone No. :"
            value={[s.school_name, s.school_address, s.school_phone].filter(Boolean).join(", ")}
          />
          <div className="dotted-line" />
        </div>

        {/* Section B */}
        <h2 className="mt-4 font-bold">B) Family Details :</h2>
        <div className="mt-1 space-y-2.5">
          <Field label="1) Father's Name :" value={s.father_name} />
          <Field label="2) Full Address :" value={s.address} />
          <div className="dotted-line" />
          <Field label="3) Mother's Name :" value={s.mother_name} />
          <Field label="4) Mother's Occupation :" value={s.mother_occupation} />
          <Field
            label="5) Family Annual Income :"
            value={s.family_income ? `₹${s.family_income}` : ""}
          />
          <Field label="6) Contact Phone / Mobile No. :" value={s.contact_phone} />
        </div>

        {/* Section C */}
        <h2 className="mt-4 font-bold">C) Student's Bank Details :</h2>
        <div className="mt-1 space-y-2.5">
          <Field label="a) Bank Account Number :" value={s.bank_account} />
          <Field
            label="b) Bank Name and Branch :"
            value={[s.bank_name, s.bank_branch].filter(Boolean).join(", ")}
          />
          <Field label="c) Bank IFSC Code :" value={s.ifsc} />
          <Field label="d) Student's Annual School / College Fee :" value={s.annual_fee} />
        </div>
      </div>

      {/* ============ PAGE 2 ============ */}
      <div className="border-2 border-red-700 p-6">
        <p className="text-justify text-[12px]">
          I hereby declare that all the details furnished above are true to the best of my
          knowledge, in witness whereof I sign below along with the recommending authority.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-6 text-center text-[12px]">
          <div>
            <div className="dotted-line mb-1" />
            <p className="font-semibold">Student's Signature</p>
          </div>
          <div>
            <div className="dotted-line mb-1" />
            <p className="font-semibold">Father / Mother / Guardian's Signature</p>
          </div>
          <div>
            <div className="dotted-line mb-1" />
            <p className="font-semibold">
              Signature &amp; Mobile No. of Local G.S.B. Samaj President / Math / Temple
              Office-bearer (Recommendation)
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-[12px]">
          <Field label="Date :" value={appDate} className="max-w-60" />
          <Field label="Place :" className="max-w-60" />
        </div>

        {/* Eligibility */}
        <h2 className="mt-6 font-bold underline">Eligibility</h2>
        <ol className="mt-1 list-inside space-y-0.5 text-[12px]">
          <li>1. Those who have passed S.S.L.C.</li>
          <li>2. Those studying in I &amp; II Year P.U.C. (First and Second Year P.U.C.)</li>
          <li>3. Those studying in Degree courses (1st, 2nd &amp; 3rd Year Degree)</li>
          <li>4. Those studying in Engineering / Medical courses</li>
          <li>
            5. Those studying in M.A. / M.Com. / M.B.A. (First Year) and other Post-Graduate
            courses
          </li>
        </ol>

        {/* Rules */}
        <h2 className="mt-4 font-bold">E) Rules and Conditions :</h2>
        <ol className="mt-1 space-y-1 text-[12px]">
          <li>1) First preference will be given to Ration Card holders.</li>
          <li>
            2) The applicant student's family must hold membership of the local Gowda Saraswat
            Samaj.
          </li>
          <li>
            3) The application must be recommended by the office-bearers of the applicant's local
            G.S.B. Samaj, Temple, Math or Mandir.
          </li>
          <li>
            4) Copies of the Marks Card, Fee Receipt and Certificates — Aadhar Card, Income
            Certificate and Bank Pass Book — must be attached (Only Nationalized Bank), along with
            a Photo.
          </li>
          <li>5) Incomplete applications will be rejected.</li>
          <li>
            6) The final decision on the application rests with the Administrative Committee of
            Shri Deva Bhandara (Temple Administration).
          </li>
          <li>
            7) Applications must reach your local representative on or before the announced date.
            Applications received late will not be considered. Only applications received in
            original will be considered.
          </li>
          <li>8) Photocopies (Xerox) of the application will not be accepted.</li>
          <li>9) Only applications in the Temple's prescribed format will be accepted.</li>
          <li>
            10) For further details, contact : 04998-272221&nbsp;&nbsp;|&nbsp;&nbsp;9188599221
            (Temple Office)&nbsp;&nbsp;|&nbsp;&nbsp;Email ID : samjstemple@gmail.com
          </li>
        </ol>

        {/* Pete members table */}
        <h2 className="mt-5 text-center font-bold">18 Pete Members Name &amp; Contact No.</h2>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <tbody>
            {PETE_MEMBERS.map((row, i) => (
              <tr key={i}>
                <td className="border border-gray-700 px-1.5 py-0.5 font-semibold">{row[0]}</td>
                <td className="border border-gray-700 px-1.5 py-0.5">{row[1]}</td>
                <td className="border border-gray-700 px-1.5 py-0.5">Mob: {row[2]}</td>
                <td className="border border-gray-700 px-1.5 py-0.5 font-semibold">{row[3]}</td>
                <td className="border border-gray-700 px-1.5 py-0.5">{row[4]}</td>
                <td className="border border-gray-700 px-1.5 py-0.5">Mob: {row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex items-end justify-between text-[12px]">
          <Field label="Encl :" className="max-w-52 flex-1" />
          <div className="text-center font-semibold">
            <p>Administrative Committee</p>
            <p>Shrimath Ananteshwar Temple</p>
            <p>Manjeshwar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
