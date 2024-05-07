package com.oracle.coherence.idrs;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import com.oracle.coherence.common.base.Logger;

import com.tangosol.coherence.config.Config;
import com.tangosol.internal.net.topic.impl.paged.model.PagedPosition;
import com.tangosol.net.Coherence;
import com.tangosol.net.Session;
import com.tangosol.net.topic.NamedTopic;
import com.tangosol.net.topic.Subscriber;

@SuppressWarnings("unchecked")
public class TrackerMain
        implements Constants
    {
    @SuppressWarnings("InfiniteLoopStatement")
    public static void main(String[] args) throws Exception
        {
        try (Coherence coherence = Coherence.clusterMember())
            {
            coherence.start().get(5, TimeUnit.MINUTES);

            Session                     session     = coherence.getSession();
            String                      sTopicState = Config.getProperty(PROP_STATE_TOPIC, DEFAULT_STATE_TOPIC);
            String                      sGroup      = Config.getProperty(PROP_STATE_GROUP);
            NamedTopic<ChannelPosition> topicState  = session.getTopic(sTopicState);

            try (Subscriber<ChannelPosition> subscriber = topicState.createSubscriber(Subscriber.inGroup(sGroup)))
                {
                m_fRunning = true;
                Logger.info("Entering Tracker loop");
                while (true)
                    {
                    Subscriber.Element<ChannelPosition> element     = subscriber.receive().get();
                    ChannelPosition                     position    = element.getValue();
                    int                                 nChannel    = position.getChannel();
                    ChannelPosition                     lastChanPos = m_aReceived[nChannel];
                    PagedPosition                       lastPos     = lastChanPos == null ? null : lastChanPos.getPosition();
                    PagedPosition                       thisPos     = position.getPosition();

//                    Logger.info("Received " + element);
                    if (lastPos != null)
                        {
                        long nLastPage   = lastPos.getPage();
                        int  nLastOffset = lastPos.getOffset();
                        long nThisPage   = thisPos.getPage();
                        int  nThisOffset = thisPos.getOffset();
                        if (nThisPage == nLastPage)
                            {
                            if (nThisOffset - nLastOffset > 1)
                                {
                                Logger.err("Missed message for channel " + position.getChannel() + " received=" + position + " last=" + lastChanPos);
                                m_listMissed.add(new MissedInfo(nChannel, lastChanPos, position));
                                }
                            if (nThisOffset <= nLastOffset)
                                {
                                m_nRepeated++;
                                }
                            }
                        else if (nThisPage > nLastPage)
                            {
                            if (nThisPage - nLastPage > 1)
                                {
                                Logger.err("Missed message for channel " + position.getChannel() + " received=" + position + " last=" + lastChanPos);
                                m_listMissed.add(new MissedInfo(nChannel, lastChanPos, position));
                                }
                            if (nThisOffset != 0)
                                {
                                Logger.err("Missed message for channel " + position.getChannel() + " received=" + position + " last=" + lastChanPos);
                                m_listMissed.add(new MissedInfo(nChannel, lastChanPos, position));
                                }
                            }
                        else // nThisPage < nLastPage
                            {
                            m_nRepeated++;
                            }
                        }
                    m_aReceived[nChannel] = position;
                    m_nReceived++;
                    if (m_nReceived % 100 == 0)
                        {
                        int cMissed = m_listMissed.size();
                        Logger.info("Received " + m_nReceived + " messages (missed=" + cMissed + ", repeated=" + m_nRepeated + ")");
//                        for (int i = 0; i < m_aReceived.length; i++)
//                            {
//                            Logger.info("  Channel " + i + " " + m_aReceived[i]);
//                            }
//                        if (cMissed > 0)
//                            {
//                            m_listMissed.forEach(p -> Logger.info(p.toString()));
//                            }
                        }
                    }
                }
            }
        }

    // ----- inner class MissedInfo -----------------------------------------

    public static class MissedInfo
        {
        public MissedInfo(int nChannel, ChannelPosition lastPosition, ChannelPosition receivedPosition)
            {
            m_nChannel         = nChannel;
            m_lastPosition     = lastPosition;
            m_receivedPosition = receivedPosition;
            }

        public int getChannel()
            {
            return m_nChannel;
            }

        public ChannelPosition getLastPosition()
            {
            return m_lastPosition;
            }

        public ChannelPosition getReceivedPosition()
            {
            return m_receivedPosition;
            }

        @Override
        public String toString()
            {
            return "Missed(" +
                    "channel=" + m_nChannel +
                    ", lastPosition=" + m_lastPosition +
                    ", receivedPosition=" + m_receivedPosition +
                    ')';
            }

        private final int m_nChannel;

        private final ChannelPosition m_lastPosition;

        private final ChannelPosition m_receivedPosition;
        }


    // ----- data members ---------------------------------------------------

    private static final ChannelPosition[] m_aReceived = new ChannelPosition[34];

    private static final List<MissedInfo> m_listMissed = new ArrayList<>();

    private static long m_nLastReceive = 0;

    private static long m_nReceived = 0;

    private static long m_nRepeated = 0;

    private static boolean m_fRunning;
    }
