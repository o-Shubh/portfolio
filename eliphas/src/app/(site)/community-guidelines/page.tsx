import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { getBusiness } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "How posts, comments, reviews and author verification work on Eliphas, and what we remove.",
};

export default async function CommunityGuidelinesPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Community guidelines" updated="17 October 2026" path="/community-guidelines">
      <p>
        Eliphas is a place for readers and authors to talk about books. These guidelines cover Community posts, comments,
        article comments, book reviews and author verification. They sit alongside our <Link href="/terms">Terms of use</Link>{" "}
        and <Link href="/privacy">Privacy policy</Link>.
      </p>

      <h2>Be welcome to disagree</h2>
      <p>
        Honest opinions are welcome, including negative ones about a book. Criticise the work, not the person. We never remove a
        post, comment or review only because it is negative.
      </p>

      <h2>What we remove</h2>
      <ul>
        <li>Harassment, threats, bullying or encouraging others to target someone.</li>
        <li>Hate speech against people for their religion, caste, gender, sexuality, disability, region or language.</li>
        <li>Spam, advertising, link farming, fake accounts and coordinated or paid reviews.</li>
        <li>Someone else&apos;s private information, such as phone numbers, addresses or ID documents.</li>
        <li>Copied work you don&apos;t have the right to share, including long extracts of other people&apos;s books.</li>
        <li>Sexual content involving minors, content that promotes violence, and anything illegal in India.</li>
        <li>Pretending to be another person, author or publisher.</li>
      </ul>

      <h2>Reviews</h2>
      <ul>
        <li>Any logged-in reader can rate and review a book once, and edit or delete their review later.</li>
        <li>
          <strong>Verified purchase</strong> means the reviewer&apos;s order of that book was delivered. It disappears if the order
          is cancelled or refunded.
        </li>
        <li>Authors can&apos;t review their own books or remove reviews. They may post one public response, labelled as theirs.</li>
        <li>Don&apos;t offer or accept money, free copies or favours in exchange for a review or a rating.</li>
        <li>The average rating counts every published review; reviews we&apos;ve hidden or removed aren&apos;t counted.</li>
      </ul>

      <h2>Verified authors</h2>
      <p>
        The <strong>Verified author</strong> badge means our team checked that the profile belongs to the author. It isn&apos;t an
        endorsement of their views or a guarantee of book quality, and it is separate from Author Pro. To apply, go to Account →
        Author verification and share evidence such as links to your published books, ISBNs, a publisher or magazine page, or
        the manuscript you&apos;re publishing with us. Please don&apos;t send ID documents or ID numbers. We may ask for more
        details, decline, or later remove the badge, and we always give a reason.
      </p>

      <h2>Reporting, blocking and what happens next</h2>
      <ul>
        <li>Use <strong>Report</strong> on any post, comment, article or review. We don&apos;t tell the author who reported it.</li>
        <li>
          Our team reviews reports and may hide, restore or remove content, or restrict an account. Every decision is recorded
          with a reason.
        </li>
        <li>
          <strong>Block</strong> stops someone following you, commenting on your posts and articles, and notifying you, and hides
          their posts and comments from you. Public pages can still be seen by people who aren&apos;t logged in.
        </li>
        <li>
          If you think we got a decision wrong, email <Detail value={b.email} label="Email" /> with a link to the content.
        </li>
      </ul>

      <h2>Books: content standards</h2>
      <p>
        Every manuscript goes through seven automatic checks before it can be sent for review: a readable file, abusive language, hate speech,
        sexual content, violence and self-harm, personal data, and professional quality (placeholder text, unfinished notes and the like). The
        checks only flag what they find. Our team reads every book before it goes on sale and makes the final decision.
      </p>
      <ul>
        <li>
          <strong>Never allowed:</strong> sexually explicit material (we don&apos;t publish adult books), sexual content involving minors, hate speech
          meant to demean a group, instructions for causing harm, and other content that is illegal in India.
        </li>
        <li>
          If a book uses difficult language on purpose (for example a character&apos;s prejudice that the story criticises), the author can explain
          this to our reviewers.
        </li>
      </ul>

      <h2>Free samples</h2>
      <p>
        Samples are chosen and approved by the author and can be read by anyone. Like any web page, a sample can be saved or
        screenshotted; only the full manuscript is kept private. Buying a printed copy doesn&apos;t include an ebook.
      </p>
    </LegalPage>
  );
}
