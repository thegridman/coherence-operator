package com.oracle.coherence.idrs;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;

import com.oracle.coherence.common.base.Blocking;
import com.oracle.coherence.common.base.Logger;
import com.oracle.coherence.common.base.Randoms;

import com.tangosol.coherence.config.Config;
import com.tangosol.net.Coherence;
import com.tangosol.net.Session;
import com.tangosol.net.topic.NamedTopic;
import com.tangosol.net.topic.Publisher;

@SuppressWarnings("unchecked")
public class PublisherMain
        implements Constants
    {

    @SuppressWarnings("InfiniteLoopStatement")
    public static void main(String[] args) throws Exception
        {
        try (Coherence coherence = Coherence.clusterMember())
            {
            coherence.start().get(5, TimeUnit.MINUTES);

            Session            session   = coherence.getSession();
            String             sTopicMsg = Config.getProperty(PROP_TOPIC, DEFAULT_TOPIC);
            NamedTopic<String> topicMsg  = session.getTopic(sTopicMsg);
            String             sMsg      = Randoms.getRandomString(100, 100, true);
            long               nDelay    = Config.getLong(PROP_PUBLISH_DELAY, DEFAULT_PUBLISH_DELAY);
            Random             rnd       = new Random(System.currentTimeMillis());

            try (Publisher<String> publisher = topicMsg.createPublisher(Publisher.OrderBy.value(v -> rnd.nextInt(17))))
                {
                m_fRunning = true;
                Logger.info("Entering Publisher loop");
                while (true)
                    {
                    Publisher.Status status   = publisher.publish(sMsg).get();
                    int              nChannel = status.getChannel();
                    long             count    = m_mapCounts.getOrDefault(nChannel, 0L);
                    m_mapCounts.put(nChannel, count + 1);
                    m_cMessage++;
                    if (m_cMessage % 100 == 0)
                        {
                        Logger.info("Published " + m_cMessage + "messages. " + m_mapCounts);
                        }
                    if (nDelay > 5)
                        {
                        Blocking.sleep(nDelay);
                        }
                    }
                }
            }
        }

    // ----- data members ---------------------------------------------------

    private static long m_cMessage;

    public static final Map<Integer, Long> m_mapCounts = new HashMap<>();

    private static boolean m_fRunning;
    }
